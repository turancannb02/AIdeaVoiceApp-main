import { Recording } from '../types/recording';

export const generatePDF = async (recording: Recording) => {
  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const recordingDate = new Date(recording.timestamp).toLocaleDateString();
  const recordingLength = formatTimestamp(recording.duration);
  const exportDate = new Date().toLocaleDateString();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
          .app-name { font-size: 28px; color: #4B7BFF; text-align: center; margin-bottom: 20px; font-weight: bold; }
          .divider { border-bottom: 1px solid #E0E0E0; margin: 20px 0; }
          .title { font-size: 24px; color: #333; margin: 20px 0 10px; font-weight: bold; }
          .info-row { display: flex; justify-content: space-between; margin: 20px 0; color: #666; font-size: 12px; }
          .info-label { font-weight: bold; }
          .section-header { font-size: 18px; color: #4B7BFF; margin: 20px 0 10px; font-weight: bold; }
          .transcription { font-size: 14px; line-height: 1.5; color: #333; margin: 20px 0; }
          .categories { margin: 20px 0; }
          .category-tag { display: inline-block; background: #F5F5F5; padding: 4px 12px; border-radius: 12px; margin: 0 8px 8px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .footer-brand { color: #4B7BFF; font-weight: bold; }
          .footer-date { color: #999; font-style: italic; font-size: 10px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="app-name">AIdeaVoice 🎙️</div>
        <div class="divider"></div>
        
        <h1 class="title">${recording.title || 'Untitled Recording'}</h1>
        <div class="info-row">
          <span><span class="info-label">Recorded:</span> ${recordingDate}</span>
          <span><span class="info-label">Length:</span> ${recordingLength}</span>
        </div>

        <h2 class="section-header">Transcribed Text</h2>
        <div class="transcription">
          ${recording.transcription || 'No transcription available.'}
        </div>

        ${recording.categories && recording.categories.length > 0 ? `
          <h2 class="section-header">Categories</h2>
          <div class="categories">
            ${recording.categories.map(category => 
              `<span class="category-tag">${category}</span>`
            ).join('')}
          </div>
        ` : ''}

        <div class="footer">
          Generated with <span class="footer-brand">AIdeaVoice</span> - Your AI Voice Assistant
          <div class="footer-date">Export Date: ${exportDate}</div>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
};