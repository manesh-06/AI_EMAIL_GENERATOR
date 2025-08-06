import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [formData, setFormData] = useState({
    recipients: '',
    prompt: '',
    senderName: '',
    senderEmail: ''
  });

  const [emailContent, setEmailContent] = useState({
    subject: '',
    body: ''
  });

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailContentChange = (e) => {
    const { name, value } = e.target;
    setEmailContent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const generateEmail = async () => {
    if (!formData.recipients.trim() || !formData.prompt.trim()) {
      showAlert('Please fill in both recipients and prompt fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-email`, {
        recipients: formData.recipients,
        prompt: formData.prompt
      });

      if (response.data.success) {
        setEmailContent(response.data.email);
        showAlert('Email generated successfully!', 'success');
      } else {
        throw new Error(response.data.error || 'Failed to generate email');
      }
    } catch (error) {
      console.error('Error generating email:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate email';
      showAlert(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!emailContent.subject.trim() || !emailContent.body.trim()) {
      showAlert('Please ensure both subject and body are filled.', 'error');
      return;
    }

    if (!formData.recipients.trim()) {
      showAlert('Please enter recipient email addresses.', 'error');
      return;
    }

    setSending(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/send-email`, {
        recipients: formData.recipients,
        subject: emailContent.subject,
        body: emailContent.body,
        senderName: formData.senderName,
        senderEmail: formData.senderEmail
      });

      if (response.data.success) {
        showAlert('Email sent successfully!', 'success');
        // Reset form after successful send
        setFormData({
          recipients: '',
          prompt: '',
          senderName: '',
          senderEmail: ''
        });
        setEmailContent({
          subject: '',
          body: ''
        });
      } else {
        throw new Error(response.data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send email';
      showAlert(errorMessage, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container">
      <h1>Email Generator</h1>
      
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="recipients">Recipient Email Addresses (comma-separated)</label>
        <input
          type="text"
          id="recipients"
          name="recipients"
          value={formData.recipients}
          onChange={handleInputChange}
          placeholder="example@email.com, another@email.com"
        />
      </div>

      <div className="form-group">
        <label htmlFor="prompt">Email Prompt</label>
        <textarea
          id="prompt"
          name="prompt"
          value={formData.prompt}
          onChange={handleInputChange}
          placeholder="Describe the content you want in your email..."
        />
      </div>

      <button
        className="btn"
        onClick={generateEmail}
        disabled={loading || !formData.recipients.trim() || !formData.prompt.trim()}
      >
        {loading ? (
          <>
            <span className="loading"></span>
            Generating...
          </>
        ) : (
          'Generate Email'
        )}
      </button>

      {(emailContent.subject || emailContent.body) && (
        <div className="email-preview">
          <h3>Generated Email</h3>
          
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={emailContent.subject}
              onChange={handleEmailContentChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="body">Email Body</label>
            <textarea
              id="body"
              name="body"
              value={emailContent.body}
              onChange={handleEmailContentChange}
              placeholder="Email content will appear here..."
            />
          </div>

          <div className="sender-info">
            <div className="form-group">
              <label htmlFor="senderName">Sender Name (Optional)</label>
              <input
                type="text"
                id="senderName"
                name="senderName"
                value={formData.senderName}
                onChange={handleInputChange}
                placeholder="Your Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="senderEmail">Sender Email (Optional)</label>
              <input
                type="email"
                id="senderEmail"
                name="senderEmail"
                value={formData.senderEmail}
                onChange={handleInputChange}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <button
            className="btn btn-success"
            onClick={sendEmail}
            disabled={sending || !emailContent.subject.trim() || !emailContent.body.trim()}
          >
            {sending ? (
              <>
                <span className="loading"></span>
                Sending...
              </>
            ) : (
              'Send Email'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default App; 