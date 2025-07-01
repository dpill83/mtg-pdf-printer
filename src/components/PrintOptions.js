import React from 'react';

const paperSizes = [
  { label: 'Letter (8.5x11.0 in)', value: 'letter' },
  { label: 'A4 (210x297 mm)', value: 'a4' },
];
const scales = [
  { label: '100%', value: '100' },
  { label: '95%', value: '95' },
  { label: '90%', value: '90' },
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
  printChecklist, setPrintChecklist,
  playtestWatermark, setPlaytestWatermark,
  paperSize, setPaperSize,
  scale, setScale,
  onPrint, printing 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6 flex flex-col space-y-6 w-full">
      {/* Toggle switches in a true 2x3 grid */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-3 items-center justify-center mb-4">
        <ToggleSwitch checked={cropMarks} onChange={setCropMarks} label="Crop marks" id="crop-marks" />
        <ToggleSwitch checked={cutLines} onChange={setCutLines} label="Cut lines" id="cut-lines" />
        <ToggleSwitch checked={skipBasicLands} onChange={setSkipBasicLands} label="Skip basic lands" id="skip-basic-lands" />
        <ToggleSwitch checked={blackCorners} onChange={setBlackCorners} label="Black corners" id="black-corners" />
        <ToggleSwitch checked={printChecklist} onChange={setPrintChecklist} label="Print checklist" id="print-checklist" />
        <ToggleSwitch checked={playtestWatermark} onChange={setPlaytestWatermark} label="Playtest watermark" id="playtest-watermark" />
      </div>
      
      {/* Third row with print button and dropdowns */}
      <div className="flex flex-row items-center justify-center space-x-6">
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