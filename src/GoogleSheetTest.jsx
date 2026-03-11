import { useState, useEffect } from 'react';

function GoogleSheetTest() {
  const [status, setStatus] = useState('Loading...');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        // Convert Google Sheets URL to CSV export format
        const sheetId = '1cjd76VbZsUx_XxoDOxl_M-QP5o3BeEjiiPmM-uDy5OA';
        const gid = '866586552'; // First Date sheet
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        
        setStatus('Fetching data from Google Sheets...');
        
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Parse CSV (simple parsing for verification)
        const rows = csvText.split('\n').map(row => row.split(','));
        
        setData(rows);
        setStatus('✅ Successfully retrieved data from Google Sheet!');
        setError(null);
      } catch (err) {
        setStatus('❌ Failed to retrieve data');
        setError(err.message);
        console.error('Error fetching sheet:', err);
      }
    };

    fetchSheetData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Google Sheet Access Test</h2>
      <p><strong>Status:</strong> {status}</p>
      
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {data && (
        <div style={{ marginTop: '20px' }}>
          <h3>Data Preview (first 5 rows):</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(data.slice(0, 5), null, 2)}
          </pre>
          <p><strong>Total rows:</strong> {data.length}</p>
        </div>
      )}
    </div>
  );
}

export default GoogleSheetTest;
