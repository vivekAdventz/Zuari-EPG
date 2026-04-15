import genAI from '../config/gemini.js';
import config from '../config/env.js';
import { searchPolicy } from './search.js';
import ApiUsage from '../models/ApiUsage.js';

const MODEL_PRICING = {
    'gemini-3.1-flash-lite': { prompt: 0.0375, completion: 0.15 },
    'gemini-3.1-flash': { prompt: 0.075, completion: 0.30 },
    'gemini-2.5-flash-lite': { prompt: 0.0375, completion: 0.15 },
    'gemini-2.5-flash': { prompt: 0.075, completion: 0.30 },
    'gemini-2.5-pro': { prompt: 1.25, completion: 5.00 },
    'gemini-pro': { prompt: 0.50, completion: 1.50 }
};

const getModelPricing = (modelName) => {
    // Exact match
    if (MODEL_PRICING[modelName]) return MODEL_PRICING[modelName];
    // Partial Match (dynamic fallback)
    if (modelName.includes('pro')) return MODEL_PRICING['gemini-1.5-pro'];
    return MODEL_PRICING['gemini-1.5-flash'];
};

const logApiUsage = async (response, operation, modelName = "gemini-2.5-flash", userId = null) => {
    try {
        if (!response || !response.usageMetadata) return;

        let promptTokens = response.usageMetadata.promptTokenCount || 0;
        let completionTokens = response.usageMetadata.candidatesTokenCount || 0;
        let totalTokens = response.usageMetadata.totalTokenCount || 0;

        const rates = getModelPricing(modelName);
        const cost = ((promptTokens / 1000000) * rates.prompt) + ((completionTokens / 1000000) * rates.completion);

        await ApiUsage.create({
            model: modelName,
            promptTokens,
            completionTokens,
            totalTokens,
            cost,
            operation,
            userId
        });
    } catch (err) {
        console.error("Failed to log API usage:", err);
    }
};

const FALLBACK_MODELS = {
    'gemini-2.5-flash': 'gemini-2.5-flash-lite',
    'gemini-2.5-pro': 'gemini-2.5-flash',
};

const isHighDemandError = (err) => {
    const msg = (err?.message || err?.statusText || err?.toString() || '').toLowerCase();
    return msg.includes('high demand') || msg.includes('rate limit') || msg.includes('resource exhausted')
        || msg.includes('overloaded') || msg.includes('503') || msg.includes('429');
};

/**
 * Wrapper around genAI.models.generateContent that catches high-demand /
 * rate-limit errors and retries with a fallback model.
 * Returns { response, modelUsed }.
 */
const callGeminiWithFallback = async (options) => {
    const primaryModel = options.model;
    try {
        const response = await genAI.models.generateContent(options);
        return { response, modelUsed: primaryModel };
    } catch (err) {
        if (isHighDemandError(err)) {
            const fallbackModel = FALLBACK_MODELS[primaryModel] || 'gemini-2.5-flash-lite';
            console.warn(`Model ${primaryModel} unavailable (high demand), falling back to ${fallbackModel}`);
            // Brief backoff before retry
            await new Promise(r => setTimeout(r, 1500));
            const response = await genAI.models.generateContent({ ...options, model: fallbackModel });
            return { response, modelUsed: fallbackModel };
        }
        throw err;
    }
};

const SYSTEM_PROMPT_TEMPLATE = `
You are a helpful HR Policy Assistant for employees of the organization.

Your job is to answer employee questions clearly and accurately using the retrieved HR policy excerpts provided below.

========================
USER PROFILE INFORMATION
========================

{USER_DATA}

========================
CURRENT SYSTEM TIME
========================

{CURRENT_TIME}

========================
AVAILABLE POLICIES FOR USER
========================

Total Available: {TOTAL_POLICIES}

{AVAILABLE_POLICIES}

========================
RETRIEVED POLICY EXCERPTS
========================

{POLICY_TEXT}

Guidelines:

- Use the retrieved policy excerpts as your primary source of information.
- Use USER PROFILE INFORMATION for employee-specific questions.
- (e.g., level, department, location, employment type).

- Use the retrieved policy excerpts for HR policy-related questions.

- If the answer is clearly stated in USER PROFILE INFORMATION or policy excerpts, respond confidently.

- VERY IMPORTANT: Do NOT provide policy details, budgets, or rules that apply ONLY to a different Impact Level or Employee Category than the user's current profile, UNLESS the user has an "admin" or "superAdmin" role. 
  - If a user asks for information about a level, role, or category they do not belong to, respond with: "<p>This policy is not available for your employee profile. You are only authorized to view information relevant to your own level or role.</p>"

- If the user's question does not match the retrieved policy excerpts, BUT the topic appears to belong to one of the "AVAILABLE POLICIES FOR USER", state:
  "<p>You have not chosen the correct policy according to your question. Please choose from the available policies.</p>"

- If the information is completely missing from the excerpts and not related to another role or an available policy, say:

"<p>This is not covered in the current HR policy, or the policy is not available for your employee profile. Please contact HR.</p>"

- Do not invent policies or add external HR knowledge.
- Keep responses clear, professional, and easy to understand.
- When relevant, briefly reference the document name.

========================
Response Format
========================
If a user asks a date time aware question, respond with the date time aware answer. When outputting the current date, format it strictly as "dd-mm-yy".

You must respond in HTML format. Do not use markdown code blocks. Just return the raw HTML content.
Use semantic HTML tags like <p>, <ul>, <li>, <strong>, <em>, <h3>, etc. to structure your response.
Specifically, use <h3> for section headers (e.g. "Confirmed Holidays", "Optional Holidays").

Structure your response as follows:
<div class="policy-answer">
    <div class="answer-content">
        <p>...answer content...</p>
    </div>
    
    <div class="meta-info" style="margin-top: 1rem; border-top: 1px solid #eee; padding-top: 0.5rem; font-size: 0.9em; color: #666;">
        <p><strong>Applicability:</strong> employee category or scope if mentioned in the policy,</p>
        <p><strong>Source:</strong>document name and section if available</p>
    </div>

</div>
   
`;





const generateAIResponse = async (messages, user, selectedPolicy = null, availablePoliciesList = []) => {
    try {
        if (!config.GEMINI_API_KEY) {
            return "Server Error: Gemini API Key not configured.";
        }

        // 1. Identify the latest user query
        const latestUserMessage = messages.find(msg => msg.role === 'user');
        const query = latestUserMessage ? latestUserMessage.content : "";

        // 2. Search for relevant policies using Vector DB
        let policyText = "No relevant policies found.";
        let policyName = "Other";
        if (query) {
            try {
                const searchResults = await searchPolicy(query, user, selectedPolicy);
                if (searchResults && searchResults.length > 0) {
                    policyName = searchResults[0].policy;
                    policyText = searchResults.map(r =>
                        `--- DOCUMENT: ${r.policy} ---\n${r.content}\n--- END DOCUMENT ---\n`
                    ).join("\n");

                } else {
                    console.log("No relevant policy chunks found.");
                }
            } catch (searchError) {
                console.error("Vector search failed:", searchError);
            }
        }

        const userDataString = JSON.stringify({
            roles: user.roles || ["employee"],
            entity: user.entity ? {
                name: user.entity.name,
                entityCode: user.entity.entityCode
            } : null,
            level: user.level ? {
                name: user.level.name
            } : null,
            empCategory: user.empCategory ? {
                name: user.empCategory.name,
                code: user.empCategory.code
            } : null
        }, null, 2);

        const now = new Date();
        const dateOptions = { timeZone: 'Asia/Kolkata', dateStyle: 'full' };
        const timeOptions = { timeZone: 'Asia/Kolkata', timeStyle: 'long' };

        const formattedDate = new Intl.DateTimeFormat('en-IN', dateOptions).format(now);
        const formattedTimePart = new Intl.DateTimeFormat('en-IN', timeOptions).format(now);
        const formattedDateTime = `${formattedDate} at ${formattedTimePart}`;

        const availablePoliciesStr = availablePoliciesList.length > 0
            ? availablePoliciesList.map(p => `- ${p}`).join('\n')
            : "No policies available.";

        const systemContent = SYSTEM_PROMPT_TEMPLATE
            .replace("{POLICY_TEXT}", policyText)
            .replace("{USER_DATA}", userDataString)
            .replace("{CURRENT_TIME}", formattedDateTime)
            .replace("{AVAILABLE_POLICIES}", availablePoliciesStr)
            .replace("{TOTAL_POLICIES}", availablePoliciesList.length.toString());

        // 3. Prepare messages for Gemini
        // Convert to Gemini format: { role: 'user' | 'model', parts: [{ text: '...' }] }
        // Input `messages` is [newest, ..., oldest]
        // We need [oldest, ..., newest] for history

        const history = [...messages]
            .reverse()
            .filter(msg => msg.content) // safety check
            .map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // The last message is the new user input, so we separate it from history for chat.sendMessage
        // Actually, startChat takes history and then we call sendMessage with the new 'user' message? 
        // Or if the last message is already in history, we might duplicate it?
        // Let's assume `messages` INCLUDES the latest user message.
        // `history` now contains everything. We should pop the last user message to send it effectively, 
        // OR we can just use `generateContent` if we concatenate everything, BUT `startChat` is better for multi-turn.

        // Let's split: History (all except last) + Last Message
        const lastMsg = history.pop(); // Remove last message to handle separately if needed, OR just combine all.
        // Actually, for generateContent, we pass the *entire* history including the last user message.
        if (lastMsg) {
            history.push(lastMsg);
        }

        const { response, modelUsed } = await callGeminiWithFallback({
            model: "gemini-2.5-flash",
            contents: history, // Pass the full conversation history
            config: {
                systemInstruction: systemContent, // System prompt goes here
                temperature: 0.1,
                maxOutputTokens: 8192,
            }
        });

        let text = "";
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (response.text) {
            text = response.text;
        } else if (response.response && typeof response.response.text === 'function') {
            text = response.response.text();
        }

        await logApiUsage(response, 'chat', modelUsed, user?._id);

        return {
            content: text,
            policyName
        };

    } catch (error) {
        console.error("Gemini Error:", error);
        return {
            content: "Sorry, I'm having trouble retrieving a response.",
            policyName: null
        };
    }
};

const generateDynamicFAQs = async (policyNames) => {
    try {
        if (!config.GEMINI_API_KEY) {
            return [];
        }

        const prompt = `
You are an HR Policy Assistant. Based on the following available HR policies for the employee:
[${policyNames.join(", ")}]

Generate exactly 8 distinct Frequently Asked Questions (FAQs) that the employee might ask regarding these specific policies. 
Ask simple questino of one sentence.
dont include overtime question
For each FAQ, provide the question. Do not include any greeting or explanation.

Respond STRICTLY with a valid JSON array of objects. Each object must have the exact keys 'question'.
Return ONLY the raw JSON string, no markdown ticks, no additional text.

Example format:
[
  { "question": "What is the annual leave policy?" },
  { "question": "Tell me about health insurance benefits." }
]
        `;

        const { response, modelUsed } = await callGeminiWithFallback({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.2,
                maxOutputTokens: 1024,
            }
        });

        await logApiUsage(response, 'faq_generation', modelUsed);

        let text = response.text || (typeof response.text === 'function' ? response.text() : "");
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse FAQ JSON from Gemini:", text);
            return [];
        }
    } catch (error) {
        console.error("Gemini FAQ Error:", error);
        return [];
    }
};

const classifyQuestionTheme = async (question, themes = []) => {
    try {
        if (!config.GEMINI_API_KEY) return null;

        const themeList = themes.map((t, i) => `${i + 1}. Theme: "${t.name}"\n   Definition: ${t.description || 'N/A'}\n   Examples: ${t.exampleQueries || 'N/A'}`).join('\n\n');

        const { response, modelUsed } = await callGeminiWithFallback({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: `Question: "${question}"` }] }],
            config: {
                systemInstruction: `You are an HR analytics assistant. Classify the user question STRICTLY into one of the following predefined categories based on their definitions and examples:

${themeList}

RULES:
- You MUST choose the most relevant category from the exact names listed above.
- Do NOT create, suggest, or use any new categories.
- If the question does not clearly fit into any specific category, classify it as "Other / Unclassified".
- Return ONLY JSON: {"theme": "Exact Category Name"}`,
                temperature: 0.1,
                maxOutputTokens: 1024
            }
        });

        await logApiUsage(response, 'theme_classification', modelUsed);


        const text = (typeof response.response?.text === 'function' ? response.response.text() :
            typeof response.text === 'function' ? response.text() :
                response.text) || "";

        if (!text) return null;

        // Robust JSON extraction: look for the first { and last }
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first === -1 || last === -1) return null;

        const jsonStr = text.substring(first, last + 1);
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('classifyQuestionTheme: JSON parse failed for:', jsonStr);
            return null;
        }
    } catch (err) {
        console.error('classifyQuestionTheme error:', err);
        return null;
    }
};

/**
 * ── Cluster Demand Gaps ───────────────────────────────────────────────────
 * Analyzes unhelpful feedback questions and dynamically identifies 3-5 
 * emerging themes/knowledge gaps.
 */
export const clusterDemandGaps = async (feedbacks) => {
    if (!feedbacks || feedbacks.length === 0) return [];

    try {
        const prompt = `
        Analyze these employee questions and group them into 3-5 distinct knowledge gaps (clusters).
        Questions:
        ${feedbacks.map((f, i) => `[ID:${i}] ${f}`).join('\n')}

        Return your analysis ONLY as a JSON array of objects with exactly this structure:
        [
          {
            "theme": "Theme Title",
            "indices": [index1, index2],
            "samples": ["sample question text 1", "sample question text 2"]
          }
        ]
        
        Use the [ID:x] numbers provided above for the "indices" array.
        `;

        const { response, modelUsed } = await callGeminiWithFallback({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: "You are an HR Analytics expert. Your task is to analyze a list of employee questions that the chatbot failed to answer correctly (unhelpful feedback). Cluster these questions into 3-5 distinct, meaningful themes or knowledge gaps. Provide a title for the theme, a count of how many questions belong to it, and 2 sample questions for each.",
                maxOutputTokens: 2000,
                temperature: 0.2
            }
        });

        await logApiUsage(response, 'demand_gap_clustering', modelUsed);

        const responseText = (typeof response.response?.text === 'function' ? response.response.text() :
            typeof response.text === 'function' ? response.text() :
                response.text) || "";

        if (!responseText) return [];

        // Use robust JSON extraction
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('clusterDemandGaps: JSON parse failed for:', jsonStr);
            return [];
        }
    } catch (err) {
        console.error('clusterDemandGaps error:', err);
        return [];
    }
};

/**
 * ── Generate Themes from Policies ─────────────────────────────────────────
 * Analyzes the text of all HR policies and extracts distinct, comprehensive
 * thematic categories covering the material.
 */
export const generateThemesFromPolicies = async (policyContext) => {
    try {
        if (!config.GEMINI_API_KEY) return [];

        const prompt = `
        You are an expert HR Analyst. Based on the following summary/extracts of the company's HR policies:
        
        ${policyContext}
        
        Your task is to generate a comprehensive list of specific, clear, and distinct HR Themes (Categories) that employee questions might fall under.
        
        Rules for Themes:
        - Must be concise, ideally 3-6 words (e.g. "Maternity Leave Eligibility", "Travel Budget Rules").
        - Must cover all major topics found in the provided policy text.
        - Do not create overlapping or overly broad themes (like just "HR" or "Policies").
        - Return ONLY a JSON array of strings. No markdown, no explanations.
        
        Example:
        ["Health Insurance Benefits", "Remote Work Policy", "Expense Reimbursement"]
        `;

        const { response, modelUsed } = await callGeminiWithFallback({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: "You are an HR Analyst creating a taxonomy of policy themes. Return only a Raw JSON array of strings.",
                temperature: 0.1,
                maxOutputTokens: 2048
            }
        });

        await logApiUsage(response, 'policy_theme_generation', modelUsed);

        let responseText = "";
        if (typeof response.text === 'function') {
            responseText = response.text();
        } else if (response.text) {
            responseText = response.text;
        } else if (response.response && typeof response.response.text === 'function') {
            responseText = response.response.text();
        }

        if (!responseText) return [];

        // Clean out possible markdown code block artifacts
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const themes = JSON.parse(cleanText);
            if (Array.isArray(themes)) return themes;
            return [];
        } catch (e) {
            console.error('generateThemesFromPolicies: JSON parse failed for:', cleanText);
            return [];
        }
    } catch (err) {
        console.error('generateThemesFromPolicies error:', err);
        return [];
    }
}

/**
 * Evaluate whether raising a ticket is necessary given the conversation context.
 * Uses Gemini 2.5 Flash for fast evaluation.
 */
const evaluateTicketNecessity = async (conversationMessages = [], userQuestion, aiResponse, user = null, selectedPolicy = null) => {
    try {
        if (!config.GEMINI_API_KEY) {
            return { necessary: true, reason: 'Evaluation unavailable.' };
        }

        const contextSummary = conversationMessages
            .slice(-10)
            .map(m => `${m.role === 'user' ? 'Employee' : 'AI'}: ${(m.content || '').replace(/<[^>]*>/g, '').substring(0, 300)}`)
            .join('\n');

        // Search vector DB for relevant policy context
        let policyContext = '';
        if (user && userQuestion) {
            try {
                const searchResults = await searchPolicy(userQuestion, user, selectedPolicy, 20);
                if (searchResults.length > 0) {
                    policyContext = searchResults.map(r =>
                        `--- POLICY: ${r.policy} ---\n${r.content}\n--- END ---`
                    ).join('\n');
                }
            } catch (searchErr) {
                console.error('Policy search for ticket evaluation failed:', searchErr);
            }
        }

        const userContent = [
            `RECENT CONVERSATION:\n${contextSummary}`,
            `LATEST EMPLOYEE QUESTION:\n${userQuestion}`,
            `AI RESPONSE PROVIDED:\n${(aiResponse || '').replace(/<[^>]*>/g, '').substring(0, 1500)}`,
            policyContext ? `RELEVANT POLICY EXCERPTS:\n${policyContext}` : ''
        ].filter(Boolean).join('\n\n');

        const { response, modelUsed } = await callGeminiWithFallback({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            config: {
                systemInstruction: `You are a Quality Assurance evaluator for an HR support system. An employee wants to raise a support ticket after receiving an AI response.

Your job is to evaluate whether the AI response already adequately addresses the employee's question.

Evaluate based on:
1. Did the AI response directly answer the question?
2. Is the response accurate, complete and actionable?
3. Does the employee's query require human intervention (e.g. approvals, personal records, disputes, escalations)?
4. Is the query about something the AI cannot handle (e.g. updating records, processing requests)?
5. Do the RELEVANT POLICY EXCERPTS (if provided) contain information that adequately answers the employee's question but the AI response missed or got wrong?

Return ONLY valid JSON:
{
  "necessary": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "Brief 1-2 sentence explanation of your assessment",
  "suggestion": "If not necessary, a brief suggestion for the employee on what to try instead",
  "preciseAnswer": "If necessary is false, provide a direct, concise, and helpful answer to the employee's question based strictly on the RELEVANT POLICY EXCERPTS. Leave empty if necessary is true."
}

IMPORTANT: If the query genuinely requires human HR intervention, ALWAYS mark necessary as true. When in doubt, lean toward allowing the ticket.`,
                temperature: 0.2,
                maxOutputTokens: 1024,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        await logApiUsage(response, 'ticket_evaluation', modelUsed);

        let text = '';
        try {
            text = (typeof response.text === 'function' ? response.text() : response.text) || '';
        } catch (_) {
            if (response.candidates?.[0]?.content?.parts) {
                text = response.candidates[0].content.parts
                    .filter(p => p.text)
                    .map(p => p.text)
                    .join('');
            }
        }
        if (!text) return { necessary: true, reason: 'Evaluation could not be completed.' };

        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first === -1 || last === -1) return { necessary: true, reason: 'Evaluation could not be completed.' };

        return JSON.parse(text.substring(first, last + 1));
    } catch (err) {
        console.error('evaluateTicketNecessity error:', err);
        return { necessary: true, reason: 'Evaluation unavailable. You may proceed.' };
    }
};

/**
 * Evaluate whether an independent ticket (no chat context) truly needs human HR intervention.
 * Searches ALL policies for the user's entity in the vector DB and lets the LLM decide.
 */
const evaluateIndependentTicket = async (subject, description, user) => {
    try {
        if (!config.GEMINI_API_KEY) {
            return { necessary: true, reason: 'Evaluation unavailable.' };
        }

        const query = `${subject} ${description}`.trim();

        // Search vector DB across all policies for the user's entity
        let policyContext = '';
        if (user && query) {
            try {
                const searchResults = await searchPolicy(query, user, null, 20);
                if (searchResults.length > 0) {
                    policyContext = searchResults.map(r =>
                        `--- POLICY: ${r.policy} ---\n${r.content}\n--- END ---`
                    ).join('\n');
                }
            } catch (searchErr) {
                console.error('Policy search for independent ticket evaluation failed:', searchErr);
            }
        }

        const userContent = [
            `EMPLOYEE TICKET SUBJECT:\n${subject}`,
            `EMPLOYEE TICKET DESCRIPTION:\n${description}`,
            policyContext ? `RELEVANT POLICY EXCERPTS:\n${policyContext}` : ''
        ].filter(Boolean).join('\n\n');

        const { response, modelUsed } = await callGeminiWithFallback({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            config: {
                systemInstruction: `You are a Quality Assurance evaluator for an HR support system. An employee wants to raise a support ticket directly (without chatting with AI first).

Your job is to evaluate whether the employee's question can already be answered by the company's HR policies, or if it genuinely needs human HR intervention.

Evaluate based on:
1. Do the RELEVANT POLICY EXCERPTS (if provided) contain clear, direct answers to the employee's question?
2. Is this something that requires human intervention (e.g. approvals, personal records, disputes, escalations, processing requests)?
3. Is the query specific enough that automated policy information would be sufficient?
4. Could the employee find the answer by chatting with the AI assistant instead?

Return ONLY valid JSON:
{
  "necessary": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "Brief 1-2 sentence explanation of your assessment",
  "suggestion": "If not necessary, a brief suggestion for the employee on what to try instead (e.g. which policy to check in AskHR chat)",
  "preciseAnswer": "If necessary is false, provide a direct, concise, and helpful answer to the employee's question based strictly on the RELEVANT POLICY EXCERPTS. Leave empty if necessary is true."
}

IMPORTANT: If the query genuinely requires human HR intervention, ALWAYS mark necessary as true. When in doubt, lean toward allowing the ticket.`,
                temperature: 0.2,
                maxOutputTokens: 1024,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        await logApiUsage(response, 'independent_ticket_evaluation', modelUsed);

        let text = '';
        try {
            text = (typeof response.text === 'function' ? response.text() : response.text) || '';
        } catch (_) {
            if (response.candidates?.[0]?.content?.parts) {
                text = response.candidates[0].content.parts
                    .filter(p => p.text)
                    .map(p => p.text)
                    .join('');
            }
        }
        if (!text) return { necessary: true, reason: 'Evaluation could not be completed.' };

        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first === -1 || last === -1) return { necessary: true, reason: 'Evaluation could not be completed.' };

        return JSON.parse(text.substring(first, last + 1));
    } catch (err) {
        console.error('evaluateIndependentTicket error:', err);
        return { necessary: true, reason: 'Evaluation unavailable. You may proceed.' };
    }
};

/**
 * Generate ticket fields (subject, category) from a plain description using AI.
 * @param {string} description – the employee's free-text description
 * @param {Array}  categories  – available QuestionTheme objects [{_id, name, description}, …]
 * @param {Object} user        – authenticated user object
 * @returns {{ subject: string, categoryId: string, categoryName: string }}
 */
const generateTicketFields = async (description, categories, user) => {
    try {
        if (!config.GEMINI_API_KEY) {
            return { subject: '', categoryId: '', categoryName: '' };
        }

        // Build a list of valid categories for the prompt
        const categoryList = categories.map(c => `ID: ${c._id} | Name: ${c.name} | Description: ${c.description || ''}`).join('\n');

        // Search policies so the model has domain context
        let policyContext = '';
        if (user && description) {
            try {
                const searchResults = await searchPolicy(description, user, null, 15);
                if (searchResults.length > 0) {
                    policyContext = searchResults.map(r =>
                        `--- POLICY: ${r.policy} ---\n${r.content}\n--- END ---`
                    ).join('\n');
                }
            } catch (searchErr) {
                console.error('Policy search for generateTicketFields failed:', searchErr);
            }
        }

        const userContent = [
            `EMPLOYEE DESCRIPTION:\n${description}`,
            policyContext ? `RELEVANT POLICY EXCERPTS:\n${policyContext}` : '',
            `AVAILABLE CATEGORIES:\n${categoryList}`
        ].filter(Boolean).join('\n\n');

        const { response, modelUsed } = await callGeminiWithFallback({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            config: {
                systemInstruction: `You are an HR ticket assistant. An employee has written a description of their issue. Based on the description and available HR policy context, generate the following fields for the ticket:

1. **subject** – A concise, clear summary of the issue (max 120 characters).
2. **description** – A professional, cohesive, and detailed synthesis of the employee's provided description, story, and intent. Ensure it flows naturally and is respectful.
3. **categoryId** – The ID of the most appropriate category from the AVAILABLE CATEGORIES list.
4. **categoryName** – The name of the chosen category.

Rules:
- The subject should capture the core issue in a short phrase.
- The description should be a single, well-structured paragraph or list that summarizes the entire context professionally.
- Pick the single best matching category. If none fit well, pick "Other / Unclassified".
- Use ONLY category IDs from the provided list.

Return ONLY valid JSON:
{
  "subject": "...",
  "description": "...",
  "categoryId": "...",
  "categoryName": "..."
}`,
                temperature: 0.3,
                maxOutputTokens: 256,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        await logApiUsage(response, 'generate_ticket_fields', modelUsed, user?._id);

        let text = '';
        try {
            text = (typeof response.text === 'function' ? response.text() : response.text) || '';
        } catch (_) {
            if (response.candidates?.[0]?.content?.parts) {
                text = response.candidates[0].content.parts
                    .filter(p => p.text)
                    .map(p => p.text)
                    .join('');
            }
        }
        if (!text) return { subject: '', categoryId: '', categoryName: '' };

        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first === -1 || last === -1) return { subject: '', categoryId: '', categoryName: '' };

        const parsed = JSON.parse(text.substring(first, last + 1));
        return {
            subject: parsed.subject || '',
            description: parsed.description || '',
            categoryId: parsed.categoryId || '',
            categoryName: parsed.categoryName || ''
        };
    } catch (err) {
        console.error('generateTicketFields error:', err);
        return { subject: '', description: '', categoryId: '', categoryName: '' };
    }
};

export default {
    generateAIResponse,
    generateDynamicFAQs,
    classifyQuestionTheme,
    clusterDemandGaps,
    generateThemesFromPolicies,
    evaluateTicketNecessity,
    evaluateIndependentTicket,
    generateTicketFields
};
