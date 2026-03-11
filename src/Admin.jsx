import { useState, useEffect } from 'react';
import './Admin.css';

function Admin() {
  const [view, setView] = useState('add'); // 'add' or 'edit'
  const [masterData, setMasterData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    showDate: '',
    showTitle: '',
    scene: '',
    sceneTitle: '',
    players: '',
    cory: '',
    teresa: '',
    jesa: '',
    brendan: '',
    jay: '',
    sean: '',
    lisa: '',
    zach: '',
    initiations: ''
  });

  const [csvOutput, setCsvOutput] = useState('');

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const response = await fetch('/src/assets/master-data.csv');
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',');
      
      const data = lines.slice(1).map((line, index) => {
        const cells = line.split(',');
        const row = { id: index };
        headers.forEach((header, idx) => {
          row[header] = cells[idx] || '';
        });
        return row;
      });
      
      setMasterData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading master data:', err);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCellEdit = (rowId, field, value) => {
    setMasterData(prev => 
      prev.map(row => 
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const deleteRow = (rowId) => {
    if (confirm('Are you sure you want to delete this row?')) {
      setMasterData(prev => prev.filter(row => row.id !== rowId));
    }
  };

  const generateCSVRow = () => {
    const row = [
      formData.showDate,
      formData.showTitle,
      formData.scene,
      formData.sceneTitle,
      formData.players,
      formData.cory || '0',
      formData.teresa || '0',
      formData.jesa || '0',
      formData.brendan || '0',
      formData.jay || '0',
      formData.sean || '0',
      formData.lisa || '0',
      formData.zach || '0',
      formData.initiations
    ].join(',');
    
    setCsvOutput(prev => prev ? `${prev}\n${row}` : row);
    
    // Reset form
    setFormData({
      ...formData,
      scene: '',
      sceneTitle: '',
      players: '',
      cory: '',
      teresa: '',
      jesa: '',
      brendan: '',
      jay: '',
      sean: '',
      lisa: '',
      zach: '',
      initiations: ''
    });
  };

  const downloadMasterData = () => {
    const headers = ['ShowDate', 'ShowTitle', 'Scene', 'SceneTitle', 'Players', 'Cory', 'Teresa', 'Jesa', 'Brendan', 'Jay', 'Sean', 'Lisa', 'Zach', 'Initiations'];
    const csvContent = [
      headers.join(','),
      ...masterData.map(row => 
        headers.map(h => row[h] || '').join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(csvOutput);
    alert('CSV data copied to clipboard! Paste it into master-data.csv');
  };

  const clearOutput = () => {
    setCsvOutput('');
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">ADMIN PANEL</h1>
        <div className="admin-header-actions">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${view === 'add' ? 'active' : ''}`}
              onClick={() => setView('add')}
            >
              Add New
            </button>
            <button 
              className={`toggle-btn ${view === 'edit' ? 'active' : ''}`}
              onClick={() => setView('edit')}
            >
              Edit Data
            </button>
          </div>
          <a href="/" className="admin-back-link">← Back to Timeline</a>
        </div>
      </div>

      {view === 'add' ? (
        <div className="admin-content">
          <div className="admin-form-section">
            <h2 className="section-title">Add Scene Data</h2>
            
            <div className="form-group">
              <label>Show Date (M/D/YYYY)</label>
              <input
                type="text"
                name="showDate"
                value={formData.showDate}
                onChange={handleChange}
                placeholder="3/5/2026"
              />
            </div>

            <div className="form-group">
              <label>Show Title</label>
              <input
                type="text"
                name="showTitle"
                value={formData.showTitle}
                onChange={handleChange}
                placeholder="SQUARE"
              />
            </div>

            <div className="form-group">
              <label>Scene (1A, 1B, D, E, etc.)</label>
              <input
                type="text"
                name="scene"
                value={formData.scene}
                onChange={handleChange}
                placeholder="1A"
              />
            </div>

            <div className="form-group">
              <label>Scene Title</label>
              <input
                type="text"
                name="sceneTitle"
                value={formData.sceneTitle}
                onChange={handleChange}
                placeholder="Wasn't Hard Enough for Grandma"
              />
            </div>

            <div className="form-group">
              <label>Players (use + separator, or "All")</label>
              <input
                type="text"
                name="players"
                value={formData.players}
                onChange={handleChange}
                placeholder="Cory+Brendan or All"
              />
            </div>

            <h3 className="subsection-title">Player Scores</h3>
            
            <div className="scores-grid">
              {['cory', 'teresa', 'jesa', 'brendan', 'jay', 'sean', 'lisa', 'zach'].map(player => (
                <div key={player} className="form-group-inline">
                  <label>{player.charAt(0).toUpperCase() + player.slice(1)}</label>
                  <input
                    type="number"
                    step="0.1"
                    name={player}
                    value={formData[player]}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Initiations (use + separator)</label>
              <input
                type="text"
                name="initiations"
                value={formData.initiations}
                onChange={handleChange}
                placeholder="Cory+Brendan"
              />
            </div>

            <button className="btn-add" onClick={generateCSVRow}>
              Add Scene to Output
            </button>
          </div>

          <div className="admin-output-section">
            <h2 className="section-title">CSV Output</h2>
            <p className="output-instructions">
              Add all scenes for a show, then copy this output and paste it at the end of master-data.csv
            </p>
            
            <textarea
              className="csv-output"
              value={csvOutput}
              readOnly
              placeholder="CSV rows will appear here..."
            />
            
            <div className="output-actions">
              <button className="btn-copy" onClick={copyToClipboard} disabled={!csvOutput}>
                Copy to Clipboard
              </button>
              <button className="btn-clear" onClick={clearOutput} disabled={!csvOutput}>
                Clear Output
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-edit-view">
          <div className="edit-header">
            <h2 className="section-title">Edit Master Data</h2>
            <button className="btn-download" onClick={downloadMasterData}>
              Download Updated CSV
            </button>
          </div>
          
          {loading ? (
            <div className="loading">Loading data...</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Show</th>
                    <th>Scene</th>
                    <th>Title</th>
                    <th>Players</th>
                    <th>Cory</th>
                    <th>Teresa</th>
                    <th>Jesa</th>
                    <th>Brendan</th>
                    <th>Jay</th>
                    <th>Sean</th>
                    <th>Lisa</th>
                    <th>Zach</th>
                    <th>Initiations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {masterData.map(row => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="text"
                          value={row.ShowDate}
                          onChange={(e) => handleCellEdit(row.id, 'ShowDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.ShowTitle}
                          onChange={(e) => handleCellEdit(row.id, 'ShowTitle', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Scene}
                          onChange={(e) => handleCellEdit(row.id, 'Scene', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.SceneTitle}
                          onChange={(e) => handleCellEdit(row.id, 'SceneTitle', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Players}
                          onChange={(e) => handleCellEdit(row.id, 'Players', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Cory}
                          onChange={(e) => handleCellEdit(row.id, 'Cory', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Teresa}
                          onChange={(e) => handleCellEdit(row.id, 'Teresa', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Jesa}
                          onChange={(e) => handleCellEdit(row.id, 'Jesa', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Brendan}
                          onChange={(e) => handleCellEdit(row.id, 'Brendan', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Jay}
                          onChange={(e) => handleCellEdit(row.id, 'Jay', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Sean}
                          onChange={(e) => handleCellEdit(row.id, 'Sean', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Lisa}
                          onChange={(e) => handleCellEdit(row.id, 'Lisa', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Zach}
                          onChange={(e) => handleCellEdit(row.id, 'Zach', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.Initiations}
                          onChange={(e) => handleCellEdit(row.id, 'Initiations', e.target.value)}
                        />
                      </td>
                      <td>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteRow(row.id)}
                          title="Delete row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="admin-help">
        <h3>Quick Reference</h3>
        <ul>
          <li><strong>Scene Labels:</strong> 1A, 1B, 1C, D, 2A, 2B, 2C, E, 3A, 3B, 3C, etc.</li>
          <li><strong>Players:</strong> Use + to separate (e.g., "Cory+Lisa") or "All" for group games</li>
          <li><strong>Scores:</strong> 1 = Started/Joined, 0.5 = Walk-on, 0.3 = Group participation</li>
          <li><strong>Initiations:</strong> Who started the scene (use + for multiple)</li>
        </ul>
      </div>
    </div>
  );
}

export default Admin;
