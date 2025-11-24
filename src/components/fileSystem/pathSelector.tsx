import React from "react";

type Props = {
    path: string;
    setPath: React.Dispatch<React.SetStateAction<string>>;
    loading: boolean;
    onScan: () => void;
};

export default function PathSelector({ path, setPath, loading, onScan }: Props) {
    return (
        <section className="bg-zinc-800 p-4 rounded-xl shadow flex flex-col sm:flex-row items-center gap-4">
            <input
                type="text"
                placeholder="Choose folder or disk to scan (e.g. /Users/you/Documents)"
                className="w-full flex-1 bg-zinc-700 border border-zinc-600 rounded px-4 py-2 text-zinc-100 placeholder-zinc-400"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onScan();
                }}
            />
            <button
                disabled={loading}
                onClick={onScan}
                className="bg-blue-600 disabled:bg-blue-400 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
                {loading ? 'Scanning...' : 'Scan'}
            </button>
        </section>
    );
}