interface WhatsAppSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export async function sendWhatsAppMessage(
    recipient: string,
    message: string
): Promise<WhatsAppSendResult> {

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken) {
        throw new Error('WHATSAPP_ACCESS_TOKEN is not loaded');
    }

    if (!phoneNumberId) {
        throw new Error('WHATSAPP_PHONE_NUMBER_ID is not loaded');
    }

    // Keep the Graph API version configurable.
    // If you already have a WhatsApp API version in your .env,
    // use that value.
    const apiVersion =
        process.env.WHATSAPP_API_VERSION || 'v25.0';

    const url =
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipient,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message,
                },
            }),
        });

        const data = await response.json();

        console.log(
            '[WHATSAPP] Send response:',
            JSON.stringify(data, null, 2)
        );

        if (!response.ok) {
            console.error(
                '[WHATSAPP] Failed to send message:',
                JSON.stringify(data, null, 2)
            );

            return {
                success: false,
                error:
                    data?.error?.message ||
                    'WhatsApp message failed',
            };
        }

        return {
            success: true,
            messageId: data?.messages?.[0]?.id,
        };

    } catch (error) {
        console.error(
            '[WHATSAPP] Message sending error:',
            error
        );

        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown WhatsApp error',
        };
    }
}