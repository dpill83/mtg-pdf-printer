import React from 'react';

const scales = [
  { label: '90%', value: '90' },
  { label: '91%', value: '91' },
  { label: '92%', value: '92' },
  { label: '93%', value: '93' },
  { label: '94%', value: '94' },
  { label: '95%', value: '95' },
  { label: '96%', value: '96' },
  { label: '97%', value: '97' },
  { label: '98%', value: '98' },
  { label: '99%', value: '99' },
  { label: '100%', value: '100' },
  { label: '101%', value: '101' },
  { label: '102%', value: '102' },
  { label: '103%', value: '103' },
  { label: '104%', value: '104' },
  { label: '105%', value: '105' },
  { label: '106%', value: '106' },
  { label: '107%', value: '107' },
  { label: '108%', value: '108' },
  { label: '109%', value: '109' },
  { label: '110%', value: '110' },
];

const ToggleSwitch = ({ checked, onChange, label, id }) => (
  <label className="flex items-center space-x-2 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      id={id}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full relative transition-colors duration-200">
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
    <span className="text-base text-gray-900 font-medium">{label}</span>
  </label>
);

const PrintOptions = ({ 
  cropMarks, setCropMarks,
  cutLines, setCutLines,
  blackCorners, setBlackCorners,
  skipBasicLands, setSkipBasicLands,
  printDecklist, setPrintDecklist,
  playtestWatermark, setPlaytestWatermark,
  paperSize, setPaperSize,
  scale, setScale,
  onPrint, printing,
  paperSizes
}) => {
  return (
    <div className="print-options bg-white rounded-lg shadow p-6 mt-6 flex flex-col space-y-6 w-full">
      {/* Toggle switches in a true 2x3 grid */}
      <div className="print-options-toggles grid grid-cols-3 gap-x-8 gap-y-3 items-center justify-center mb-4">
        <ToggleSwitch checked={cropMarks} onChange={setCropMarks} label="Crop marks" id="crop-marks" />
        <ToggleSwitch checked={cutLines} onChange={setCutLines} label="Cut lines" id="cut-lines" />
        <ToggleSwitch checked={skipBasicLands} onChange={setSkipBasicLands} label="Skip basic lands" id="skip-basic-lands" />
        <ToggleSwitch checked={blackCorners} onChange={setBlackCorners} label="Black corners" id="black-corners" />
        <ToggleSwitch checked={printDecklist} onChange={setPrintDecklist} label="Print decklist" id="print-checklist" />
        <ToggleSwitch checked={playtestWatermark} onChange={setPlaytestWatermark} label="Playtest watermark" id="playtest-watermark" />
      </div>
      
      {/* Third row with print button and dropdowns */}
      <div className="print-options-controls flex flex-row items-center justify-center space-x-6">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPrint}
          disabled={printing}
        >
          {printing ? (
            'Generating PDF...'
          ) : (
            <>
              <span role="img" aria-label="Print" style={{ marginRight: 4 }}>🖨️</span>Print
            </>
          )}
        </button>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="paper-size" className="text-base text-gray-900 font-medium">Paper Size:</label>
          <select 
            id="paper-size"
            className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base text-gray-900" 
            value={paperSize} 
            onChange={e => setPaperSize(e.target.value)}
          >
            {paperSizes.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label htmlFor="scale" className="text-base text-gray-900 font-medium">Scale:</label>
          <select 
            id="scale"
            className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-base text-gray-900" 
            value={scale} 
            onChange={e => setScale(e.target.value)}
          >
            {scales.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PrintOptions; 