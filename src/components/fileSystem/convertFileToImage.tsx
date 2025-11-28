import { convertFileSrc } from '@tauri-apps/api/core';

export default function ConvertFileToImage(fileUrl: string) {
    return convertFileSrc(fileUrl);
}