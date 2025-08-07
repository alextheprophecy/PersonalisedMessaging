import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { liked } = await request.json();

    const stmt = db.prepare(
      'UPDATE scraped_data SET liked = ? WHERE id = ?'
    );
    const result = stmt.run(liked ? 1 : 0, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    const selectStmt = db.prepare('SELECT * FROM scraped_data WHERE id = ?');
    const updatedHouse = selectStmt.get(id);

    return NextResponse.json(updatedHouse);
  } catch (error) {
    console.error('Error updating house:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
