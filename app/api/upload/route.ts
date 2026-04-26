import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        const urls: string[] = [];
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'expenses');

        const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB

        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        for (const file of files) {
            // Check file size
            if (file.size > MAX_SIZE) {
                return NextResponse.json({ error: `File ${file.name} exceeds the 5MB size limit.` }, { status: 400 });
            }

            // Check file extension
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                return NextResponse.json({ error: `File type .${extension} is not allowed. Only JPG, PNG, and PDF are supported.` }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const fileName = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const filePath = join(uploadsDir, fileName);

            await writeFile(filePath, buffer);
            urls.push(`/uploads/expenses/${fileName}`);
        }

        return NextResponse.json({ urls }, { status: 201 });

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
