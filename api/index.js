require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper to call Gemini REST API
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('Missing or invalid GEMINI_API_KEY in .env file');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7 }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.candidates[0].content.parts[0].text;
  } catch (err) {
    if (err.response) {
      throw new Error(`Gemini API Error: ${err.response.data.error?.message || err.response.statusText}`);
    }
    throw new Error(`Network Error: ${err.message}`);
  }
}

// Ensure date formatting helper from frontend is also available for backend prompts
function formatDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  const d = new Date(year, parseInt(month) - 1, day);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── API Endpoints ──

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.4-model-fix', time: new Date().toISOString() });
});

// 1. After Event Message
app.post('/generate-aem', async (req, res) => {
  try {
    const data = req.body;
    const dateStr = formatDate(data.eventDate);
    const guestLine = data.guest ? `We were honoured to have ${data.guest} grace the occasion.` : '';
    
    const prompt = `
You are an expert club secretary for the Leo Club of Magnificent Mahavir Nagar.
Write an exciting, engaging, and warm "After Event Message" for a recent club event.

Event Name: ${data.eventName}
Event Type: ${data.eventType}
Date: ${dateStr}
Description: ${data.eventDescription}
Guest: ${data.guest ? data.guest : 'None'}
Participants: ${data.participants}
Hours: ${data.leoisticHours}

CRITICAL RULES YOU MUST FOLLOW EXACTLY:
1. Start the message EXACTLY with: "Dear Leos," (no other greetings).
2. The tone should be exciting and warm. Use relevant emojis.
3. If a guest is mentioned, you must acknowledge them.
4. You MUST include these exact two lines formatted exactly like this somewhere in the message:
  🦁 Leos Participated: ${data.participants}
  ⏱️ Leoistic Hours: ${data.leoisticHours}
5. The closing paragraph context:
  - If Event Type is "Fellowship", talk about bonding, laughter, joy, togetherness, and strengthening the club family.
  - If Event Type is "Service", talk about contribution, impact, helping the community, and the spirit of service.
6. The message MUST end EXACTLY with this signature (do not alter this):

Warm regards,
*Ishika | Dhairvi | Manan*
_Secretarial Team_
*Leo Club of Magnificent Mahavir Nagar*
_Reach Your Beyond 🚀_
    `;

    const result = await callGemini(prompt);
    res.json({ result });
  } catch (error) {
    console.error('Error generating AEM:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. Email Draft
app.post('/generate-email', async (req, res) => {
  try {
    const data = req.body;
    const dateStr = formatDate(data.eventDate);
    
    const prompt = `
You are an expert club secretary for the Leo Club of Magnificent Mahavir Nagar.
Write a formal, professional, and concise email report regarding a recent club event.

Event Name: ${data.eventName}
Event Type: ${data.eventType}
Date: ${dateStr}
Description: ${data.eventDescription}
Guest: ${data.guest ? data.guest : 'None'}
Participants: ${data.participants}
Hours: ${data.leoisticHours}

CRITICAL RULES YOU MUST FOLLOW EXACTLY:
1. Include a formal Subject line.
2. Start the body with: "Respected Sir/Ma'am,\\n\\nGreetings from Leo Club of Magnificent Mahavir Nagar!"
3. The tone must be extremely professional and respectful.
4. Mention the event name, date, description, guest (if any), participants, and hours.
5. The message MUST end EXACTLY with this signature (do not alter this):

Thanking you,
Yours in Leoism,

Ishika | Dhairvi | Manan
Secretarial Team
Leo Club of Magnificent Mahavir Nagar
    `;

    const result = await callGemini(prompt);
    res.json({ result });
  } catch (error) {
    console.error('Error generating Email:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Only start the server if run directly (for local testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

// Export the Express API for Vercel Serverless functions
module.exports = app;
