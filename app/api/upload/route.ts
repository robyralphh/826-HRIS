import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'File is required' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Define the target directory path
        const uploadsDir = join(process.cwd(), 'public', 'uploads');

        // Check if directory exists, if not, create it
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate a unique file name
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const fileName = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`; // clean the filename
        const filePath = join(uploadsDir, fileName);

        // Write the file
        await writeFile(filePath, buffer);

        // Return the public URL for the file
        const fileUrl = `/uploads/${fileName}`;

        return NextResponse.json({ url: fileUrl }, { status: 201 });

    } catch (error: any) {
        console.error('API Error saving file:', error);
        return NextResponse.json(
            {
                error: 'Failed to upload file',
                details: error.message || 'Unknown error'
            },
            { status: 500 }
        );
    }
}
