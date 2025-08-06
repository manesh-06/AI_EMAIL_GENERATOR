const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const nodemailer = require('nodemailer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Generate email content using Groq API
app.post('/api/generate-email', async (req, res) => {
  try {
    const { prompt, recipients } = req.body;

    if (!prompt || !recipients) {
      return res.status(400).json({ 
        error: 'Prompt and recipients are required' 
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ 
        error: 'Groq API key not configured' 
      });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional email writer. Generate clear, concise, and professional email content based on the user's prompt. Include a proper subject line and body. Format the response as JSON with 'subject' and 'body' fields."
        },
        {
          role: "user",
          content: `Generate an email with the following requirements: ${prompt}. Recipients: ${recipients}`
        }
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from Groq API');
    }

    // Try to parse JSON response, fallback to plain text
    let emailContent;
    try {
      emailContent = JSON.parse(response);
    } catch (parseError) {
      // If not JSON, treat as plain text
      emailContent = {
        subject: 'Generated Email',
        body: response
      };
    }

    res.json({
      success: true,
      email: emailContent
    });

  } catch (error) {
    console.error('Error generating email:', error);
    res.status(500).json({ 
      error: 'Failed to generate email content',
      details: error.message 
    });
  }
});

// Send email using Nodemailer
app.post('/api/send-email', async (req, res) => {
  try {
    const { recipients, subject, body, senderEmail, senderName } = req.body;

    if (!recipients || !subject || !body) {
      return res.status(400).json({ 
        error: 'Recipients, subject, and body are required' 
      });
    }

    // Validate email configuration
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ 
        error: 'Email configuration not set up properly' 
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Parse recipients (comma-separated)
    const recipientList = recipients.split(',').map(email => email.trim());

    // Send email
    const mailOptions = {
      from: `"${senderName || 'Email Generator'}" <${senderEmail || process.env.EMAIL_USER}>`,
      to: recipientList.join(', '),
      subject: subject,
      html: body.replace(/\n/g, '<br>'),
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 