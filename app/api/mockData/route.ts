import { NextResponse } from 'next/server';
import { getData } from '../../../lib/mockData';

export async function GET() {
  try {
    // honor env var MOCK_SIZE if set (reduces build traces and payload size)
    const size = Number(process.env.MOCK_SIZE ?? 60);
    const payload = getData(size);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'failed to load data' }, { status: 500 });
  }
}
