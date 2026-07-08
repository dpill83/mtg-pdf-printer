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