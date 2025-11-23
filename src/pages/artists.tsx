import { useState } from "react";
import { invoke } from '@tauri-apps/api/core';
import { Songs } from "../globalValues";



export default function ArtistsPage() {

    const [loading, setLoading] = useState(false);
    const [albumList, setAlbumList] = useState<Songs[]>([]);


    async function getAlbums() {

        setLoading(true);
        try {
            const list = await invoke<Songs[]>('get_all_artists');
            console.log(list);
            setAlbumList(list);
        } catch (err) {
            alert(`Failed to scan folder: ${err}`);
        } finally {
            setLoading(false);
        }

    }


    return(
        <div>
            <h1>Artists</h1>


            <div className="">
 
            </div>

        </div>
    );
}