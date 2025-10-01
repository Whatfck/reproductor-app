import { useState, useMemo, useRef } from 'react';
import * as jsmediatags from 'jsmediatags';

export interface Song {
    id: number;
    title: string;
    artist: string;
    album: string;
    year: number | null;
    duration: string;
    url: string;
    path: string; // Añadimos la ruta para poder guardar/cargar playlists
    picture?: string;
}

const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(0);
  });
};

const formatDuration = (durationInSeconds: number): string => {
  const secondsValue = durationInSeconds || 0;
  if (isNaN(secondsValue) || secondsValue === 0) return '-:--';
  const minutes = Math.floor(secondsValue / 60);
  const seconds = Math.floor(secondsValue % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getPictureDataUrl = (picture: any): string | undefined => {
  if (picture) {
    const { data, format } = picture;
    let base64String = "";
    for (let i = 0; i < data.length; i++) {
      base64String += String.fromCharCode(data[i]);
    }
    return `data:${format};base64,${window.btoa(base64String)}`;
  }
  return undefined;
};

const getYear = (yearTag: string | number | undefined): number | null => {
  if (!yearTag) return null;
  const yearString = String(yearTag);

  const yearMatch = yearString.match(/^(\d{4})/);
  if (yearMatch) {
    const yearStr = yearMatch[1];
    const year = parseInt(yearStr, 10);
    if (year > 1000) return year;
  }
  return null;
};

export function useLibrary() {
  const [library, setLibrary] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const audioFiles = Array.from(files).filter(file =>
      file.type.startsWith('audio/')
    );
    
    const songsWithMetadata: Song[] = await Promise.all(
      audioFiles.map(async (file, index): Promise<Song> => {
        const duration = await getAudioDuration(file);
        return new Promise((resolve) => {
          jsmediatags.read(file, {
            onSuccess: (tag) => {
              const tags = tag.tags;
              resolve({
                id: Date.now() + index,
                title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                artist: tags.artist || 'Desconocido',
                album: tags.album || 'Desconocido',
                year: getYear(tags.year),
                duration: formatDuration(duration),
                picture: getPictureDataUrl(tags.picture),
                path: file.webkitRelativePath || file.name,
                url: URL.createObjectURL(file),
              });
            },
            onError: () => {
              resolve({ id: Date.now() + index, title: file.name.replace(/\.[^/.]+$/, ""), artist: 'Desconocido', album: 'Desconocido', year: null, duration: formatDuration(duration), path: file.webkitRelativePath || file.name, url: URL.createObjectURL(file) });
            }
          });
        });
      })
    );
    
    songsWithMetadata.sort((a, b) => 
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
    setLibrary(songsWithMetadata);
  };

  const triggerFolderSelector = () => {
    fileInputRef.current?.click();
  };

  const filteredLibrary = useMemo(() => {
    if (!searchTerm) return library;
    return library.filter(song =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.album.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [library, searchTerm]);

  return {
    library,
    filteredLibrary,
    searchTerm,
    setSearchTerm,
    fileInputRef,
    handleFolderSelection,
    triggerFolderSelector,
  };
}