import { GoogleGenAI } from '@google/genai';


export interface ParsedTransaction {
    isTransaction: boolean;
    type: 'income' | 'expense' | 'payment_received' | 'unknown';
    amount: number | null;
    category: string | null;
    description: string | null;
    clientName: string | null;
    confidence: number;
}

export async function parseTransactionMessage(
    text: string
): Promise<ParsedTransaction> {

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not loaded');
    }

    const ai = new GoogleGenAI({
        apiKey,
    });
    const prompt = `
You are FinTrack's transaction understanding engine.

Analyze the following WhatsApp message and extract transaction information.

Message:
"${text}"

Return ONLY valid JSON in this exact structure:

{
  "isTransaction": boolean,
  "type": "income" | "expense" | "payment_received" | "unknown",
  "amount": number | null,
  "category": string | null,
  "description": string | null,
  "clientName": string | null,
  "confidence": number
}

Rules:

1. isTransaction:
   - true if the message describes a financial transaction.
   - false otherwise.

2. type:
   - "income" when money is earned/received.
   - "payment_received" when money is explicitly received from a client/person.
   - "expense" when money is spent/paid.
   - "unknown" when the transaction type cannot be determined.

3. amount:
   - Extract the numeric monetary amount.
   - Convert ₹9,000, Rs 9000, INR 9000 etc. to 9000.
   - Return null if no amount is present.

4. category:
   - Extract the category/purpose if mentioned.
   - Examples: salary, food, electricity, rent, pocketmoney, transport, software.
   - Return null if not available.

5. description:
   - Give a short description of the transaction.

6. clientName:
   - Extract the person/client name if mentioned.
   - Example:
     "Received ₹9000 from Shreyash as pocketmoney"
     → "Shreyash"
   - Return null if no person/client is mentioned.

7. confidence:
   - Return a number between 0 and 1 representing how confident you are.

Do not invent information.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            },
        });

        const rawText = response.text;

        if (!rawText) {
            throw new Error('Gemini returned an empty response');
        }

        const parsed = JSON.parse(rawText);

        return {
            isTransaction: Boolean(parsed.isTransaction),
            type: parsed.type || 'unknown',
            amount:
                typeof parsed.amount === 'number'
                    ? parsed.amount
                    : null,
            category: parsed.category || null,
            description: parsed.description || null,
            clientName: parsed.clientName || null,
            confidence:
                typeof parsed.confidence === 'number'
                    ? parsed.confidence
                    : 0,
        };
    } catch (error) {
        console.error('[PARSER] Failed to parse transaction:', error);

        return {
            isTransaction: false,
            type: 'unknown',
            amount: null,
            category: null,
            description: null,
            clientName: null,
            confidence: 0,
        };
    }
}