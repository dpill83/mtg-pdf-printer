# mtgtopdf.com

A React web application that generates print-ready PDFs from Magic: The Gathering decklists. The app fetches high-resolution card images from the Scryfall API and creates PDFs with 9 cards per page in a 3x3 grid layout.

## Features

- **Decklist Parsing**: Supports various decklist formats (e.g., "1x Lightning Bolt (2XM) 123" or "1 Lightning Bolt")
- **High-Resolution Images**: Fetches card images from Scryfall API
- **3x3 Grid Preview**: See your cards in a preview grid before generating the PDF
- **Print-Ready PDF**: Generates PDFs with standard card size (2.5" x 3.5") and minimal margins
- **No Watermarks**: Clean output with no branding or advertisements
- **Client-Side Processing**: All PDF generation happens in the browser using pdf-lib
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mtg-pdf-printer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

## Usage

1. **Enter Your Decklist**: Paste your Magic: The Gathering decklist into the text area. The app supports various formats:
   - `4x Lightning Bolt (2XM) 123`
   - `1 Lightning Bolt`
   - `2x Counterspell`

2. **Load Cards**: Click "Load Cards" to fetch card images from Scryfall. The app will display a 3x3 grid preview of the first 9 cards.

3. **Generate PDF**: Click "Generate PDF" to create and download a print-ready PDF with all your cards.

## Supported Formats

The app can parse decklists in the following formats:
- `[quantity]x [card name] ([set code]) [collector number]`
- `[quantity] [card name] ([set code]) [collector number]`
- `[quantity]x [card name]`
- `[quantity] [card name]`

Examples:
```
4x Lightning Bolt (2XM) 123
1 Counterspell (2XM) 124
2x Brainstorm
3 Ponder (2XM) 126
```

## PDF Output

- **Page Size**: 8.5" x 11" (US Letter)
- **Cards per Page**: 9 cards in a 3x3 grid
- **Card Size**: Standard Magic card size (2.5" x 3.5")
- **Margins**: Minimal 0.25" margins for optimal printing
- **Quality**: High-resolution card images embedded directly in the PDF

## Technologies Used

- **React**: Frontend framework
- **pdf-lib**: Client-side PDF generation
- **Axios**: HTTP client for API calls
- **Scryfall API**: Magic: The Gathering card database

## API Usage

This application uses the Scryfall API to fetch card data and images. The API is free to use and doesn't require authentication for basic usage. Please refer to [Scryfall's API documentation](https://scryfall.com/docs/api) for more information.

## Development

### Project Structure

```
src/
├── components/
│   ├── DeckInput.js          # Decklist input component
│   ├── DeckInput.css
│   ├── CardGrid.js           # Card preview grid
│   └── CardGrid.css
├── utils/
│   ├── scryfall.js           # Scryfall API utilities
│   └── pdfGenerator.js       # PDF generation utilities
├── App.js                    # Main application component
├── App.css
├── index.js                  # React entry point
└── index.css                 # Global styles
```

### Available Scripts

- `npm start`: Start React development server
- `npm run dev`: Start React development server (alias for npm start)
- `npm build`: Build for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

## Browser Compatibility

This application requires a modern browser with support for:
- ES6+ JavaScript features
- Fetch API
- File API (for PDF download)
- Canvas API (for image processing)

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Local Development

To run locally, use `vercel dev` for full-stack (React frontend + API routes), or `npm start` for frontend-only.

- `vercel dev`: Runs both the React frontend and serverless API routes (e.g., /api/generate-pdf) locally. This is required for full functionality.
- `npm start`: Runs only the React frontend. API routes will not be available locally. 