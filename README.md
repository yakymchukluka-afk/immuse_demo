# Immuse - Archive-to-Tour MVP

Backend-first MVP for creating personalized museum tours from archive materials using OpenAI's file search and vector stores.

## Features

- ✅ Next.js 14 with App Router and TypeScript
- ✅ SQLite + Prisma for data persistence
- ✅ OpenAI Node SDK with Vector Stores and File Search
- ✅ File upload with drag-and-drop support
- ✅ Floorplan editor with react-konva
- ✅ Ukrainian-only UI with shadcn/ui
- ✅ Complete 5-step wizard workflow

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Add your OpenAI API key to .env.local
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open http://localhost:3000**

## API Endpoints

### Museums
- `POST /api/museums` - Create museum
- `POST /api/museums/[id]/archives` - Upload files or add URLs
- `POST /api/museums/[id]/ingest` - Process archives with OpenAI
- `GET /api/museums/[id]/ingest/status` - Check processing status
- `POST /api/museums/[id]/floorplan` - Save floorplan data

### Tours
- `POST /api/tours` - Generate tour from museum data
- `GET /api/tours/[id]` - Get saved tour

### Testing
- `GET /api/test-openai` - Test OpenAI API connection

## Database Schema

The app uses Prisma with SQLite and includes these models:

- **Museum** - Basic museum information
- **ArchiveFile** - Uploaded files and URLs with processing status
- **Floorplan** - Floorplan images and manual marker data
- **TourRequest** - User preferences for tour generation
- **TourPlan** - Generated tour results from OpenAI

## Workflow

1. **Museum Info** - Enter basic museum details
2. **Archives** - Upload files (.pdf, .txt, .docx, .zip) or add URLs
3. **Floorplan** - Upload floorplan image and add markers manually
4. **Processing** - Wait for OpenAI to process archives
5. **Tour Generation** - Generate personalized tour based on interests

## Testing

The app includes test files in `test-files/` directory:
- `museum-info.txt` - General museum information
- `economic-history.txt` - Economic history content

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
```

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** SQLite
- **AI:** OpenAI API (Vector Stores, File Search, Responses API)
- **File Handling:** Busboy for multipart uploads
- **Canvas:** react-konva for floorplan editor
- **Validation:** Zod for API validation

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   └── page.tsx       # Main page
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── FloorplanEditor.tsx
│   └── MuseumWizard.tsx
├── lib/
│   ├── prisma.ts     # Prisma client
│   └── utils.ts      # Utility functions
├── locales/
│   └── uk.ts         # Ukrainian translations
└── generated/
    └── prisma/       # Generated Prisma client
```

## Development Notes

- All UI text is in Ukrainian as specified
- File uploads are stored in `uploads/` directory
- OpenAI vector stores are created per museum
- Tour generation uses structured JSON output with strict schema
- Floorplan editor supports manual marker placement
- Status polling for archive processing

## Next Steps

- Add PDF generation for tours
- Implement sharing URLs for saved tours
- Add progress bars for file uploads
- Implement rate limiting for tour generation
- Add more file format support
- Enhance floorplan editor with room drawing tools