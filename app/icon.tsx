import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
    width: 512,
    height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 300,
                    background: 'linear-gradient(to bottom right, #2563eb, #1d4ed8)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '20%',
                    fontFamily: 'sans-serif',
                    fontWeight: 'bold',
                }}
            >
                A
            </div>
        ),
        {
            ...size,
        }
    );
}
