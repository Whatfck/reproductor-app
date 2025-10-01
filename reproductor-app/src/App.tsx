declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

import { useEffect, useState } from 'react';
import { useLibrary } from './useLibrary';
import { usePlaylist, type RepeatMode } from './usePlaylist';
import { useAudioPlayer } from './useAudioPlayer';

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds().toString().padStart(2, '0');
  if (hh > 0) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
  }
  return `${mm}:${ss}`;
};

import { FolderIcon, LoopIcon, MutedIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, ShuffleIcon, VolumeIcon, XIcon, SaveIcon, FolderOpenIcon, PlusIcon } from './Icons';
function App() {
  const {
    library,
    filteredLibrary,
    searchTerm,
    setSearchTerm,
    fileInputRef,
    handleFolderSelection,
    triggerFolderSelector,
  } = useLibrary();

  const {
    currentSong,
    playQueue,
    isQueueEmpty,
    currentNode,
    nextSong,
    prevSong,
    playSongNow,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    loadQueue,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeatMode,
  } = usePlaylist();

  const [playlistName, setPlaylistName] = useState("Cola de Reproducción");
  const [isPlaylistDirty, setIsPlaylistDirty] = useState(false);
  const [draggedSongId, setDraggedSongId] = useState<string | null>(null);

  // --- Lógica para Guardar y Cargar Playlists ---
  // NOTA: Esto simula la interacción con un backend o API de Electron.
  // En una app real, aquí llamarías a `window.electron.saveFile(...)` etc.

  const handleSavePlaylist = () => {
    if (playQueue.length === 0) return;

    const name = prompt("Nombre de la playlist:", playlistName.replace(" *", ""));
    if (!name) return;

    const playlistData = {
      name,
      songPaths: playQueue.map(song => song.path),
    };

    const blob = new Blob([JSON.stringify(playlistData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setPlaylistName(name);
    setIsPlaylistDirty(false);
  };

  const handleLoadPlaylist = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const content = await file.text();
      const { name, songPaths } = JSON.parse(content);
      const songsToLoad = library.filter(song => songPaths.includes(song.path));
      
      clearQueue();
      loadQueue(songsToLoad);
      setPlaylistName(name || file.name.replace(".json", ""));
      setIsPlaylistDirty(false);
    };
    input.click();
  };

  const {
    audioRef,
    isPlaying,
    duration,
    currentTime,
    volume,
    togglePlay: baseTogglePlay,
    handleSeek,
    handleVolumeChange,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
  } = useAudioPlayer(currentSong, nextSong, repeatMode);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(volume);

  useEffect(() => {
    return () => {
      library.forEach(song => URL.revokeObjectURL(song.url));
    };
  }, [library]);

  const togglePlay = () => {
    if (!currentSong && filteredLibrary.length > 0) {
      playSongNow(filteredLibrary[0]);
    } else {
      baseTogglePlay();
    }
  };

  // --- Lógica de Drag and Drop ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, songId: string) => {
    e.dataTransfer.setData('songId', songId);
    setDraggedSongId(songId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetSongId: string | null) => {
    const draggedId = e.dataTransfer.getData('songId');
    if (draggedId === targetSongId) {
      setDraggedSongId(null);
      return;
    };

    reorderQueue(draggedId, targetSongId);
    setDraggedSongId(null);
    setIsPlaylistDirty(true);
  };

  const handleAddToQueue = (song: any) => {
    addToQueue(song);
    setIsPlaylistDirty(true);
  }

  const handleRemoveFromQueue = (songId: string) => {
    removeFromQueue(songId);
    setIsPlaylistDirty(true);
  }

  const toggleMute = () => {
    if (isMuted) {
      // Si el volumen antes de silenciar era 0, restauramos a un valor por defecto (ej. 50%)
      const newVolume = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
      handleVolumeChange({ target: { value: String(newVolume) } } as React.ChangeEvent<HTMLInputElement>);
      setIsMuted(false);
    } else {
      setVolumeBeforeMute(volume);
      handleVolumeChange({ target: { value: '0' } } as React.ChangeEvent<HTMLInputElement>);
      setIsMuted(true);
    }
  };

  useEffect(() => {
    setIsMuted(volume === 0);    
  }, [volume]);

  const getRepeatIcon = (mode: RepeatMode) => {
    if (mode === 'all') {
      return <LoopIcon />;
    }
    if (mode === 'one') { 
      return (
        <div className="relative">
          <LoopIcon />
          <span className="absolute -top-1 -right-1 text-xs font-bold text-purple-400">1</span>
        </div>
      );
    }
    // mode === 'none'
    return <LoopIcon />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 font-sans">

      
      <input type="file" webkitdirectory="" directory="" multiple ref={fileInputRef} onChange={handleFolderSelection} className="hidden" />

      <header className="flex-shrink-0 w-full h-16 bg-gray-900 text-white shadow-lg flex items-center justify-between px-6 border-b border-gray-800 z-10">
        <h1 className="text-xl font-bold text-purple-400 w-1/4 flex-shrink-0">Reproductor-app</h1>
        <div className="relative w-1/2 flex justify-center">
          <input
            type="text"
            placeholder="Buscar en la Biblioteca..."
            className="bg-gray-800 text-white rounded-full px-4 py-2 w-full max-w-lg focus:ring-1 focus:ring-purple-500 focus:outline-none placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-1/4 justify-end flex-shrink-0">
          <button onClick={triggerFolderSelector} title="Abrir carpeta de música" aria-label="Abrir carpeta de música" className="text-gray-400 hover:text-purple-400 transition-colors">
            <FolderIcon />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full flex overflow-hidden">
        <aside className="flex-shrink-0 w-[250px] bg-gray-900 text-white p-6 border-r border-gray-800 hidden md:flex flex-col">
          <div className="h-full w-full flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold text-purple-300 mb-4">Ahora Suena</h3>
            <div className="w-full max-w-[180px] aspect-square bg-gray-700 rounded-lg shadow-xl mb-4">
              <img src={currentSong?.picture || `https://placehold.co/250x250/1e1b4b/9333ea?text=${currentSong?.album || '...'}`} alt="Carátula" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="space-y-1 w-full max-w-[200px]">
              <p className="text-lg font-extrabold text-white break-words" title={currentSong?.title}>{currentSong?.title || 'Selecciona una canción'}</p>
              <p className="text-sm text-gray-400">{currentSong?.artist || '...'}</p>
              <p className="text-xs text-purple-400">{currentSong ? `${currentSong.album} - ${currentSong.year}` : '...'}</p>
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-gray-800 text-white p-4 sm:p-8 overflow-hidden relative">
          <div className="absolute inset-0 p-4 sm:p-8">
            <div className="bg-gray-900 rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
              <div className="grid grid-cols-[40px_2fr_1.5fr_1.5fr_60px_60px] gap-4 p-4 text-xs font-semibold uppercase text-gray-400 border-b border-gray-700 flex-shrink-0">
                <div></div>
                <div>Título</div>
                <div className="hidden sm:block">Artista</div>
                <div className="hidden md:block">Álbum</div>
                <div className="text-center hidden lg:block">Año</div>
                <div className="text-right">Duración</div>
              </div>
              <div className="divide-y divide-gray-800 text-sm overflow-y-auto 
                            [&::-webkit-scrollbar]:w-2
                            [&::-webkit-scrollbar-track]:bg-gray-800
                            [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                  {filteredLibrary.length > 0 ? filteredLibrary.map((song) => (
                    <div 
                      key={song.id} 
                      className={`group grid grid-cols-[40px_2fr_1.5fr_1.5fr_60px_60px] gap-4 items-center p-3 sm:p-4 text-gray-300 transition-colors cursor-pointer ${currentSong?.id === song.id ? 'bg-purple-900/40 text-purple-400 font-semibold' : 'hover:bg-gray-800/50'}`}
                      onClick={() => { if (isQueueEmpty) { playSongNow(song); } }}
                    >
                      <div className="flex items-center justify-center">
                        <button title="Añadir a la cola" className="text-gray-500 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }}>
                          <PlusIcon size={18} />
                        </button>
                      </div>
                      <div className="truncate">{song.title}</div>
                      <div className="truncate hidden sm:block">{song.artist}</div>
                      <div className="truncate hidden md:block">{song.album}</div>
                      <div className="text-center hidden lg:block">{song.year || ''}</div>
                      <div className="text-right">{song.duration}</div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-gray-500 flex-1 flex flex-col items-center justify-center gap-4">
                      {library.length === 0 ? (
                        <b className='flex flex-col items-center gap-2 text-base'><span>Usa el icono de carpeta para cargar tu música.</span><FolderIcon /></b>
                      ) : (
                        "No se encontraron resultados."
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </section>

        {/* --- Nueva Barra Lateral: Cola de Reproducción --- */}
        <aside className="flex-shrink-0 w-[300px] bg-gray-900 text-white p-6 border-l border-gray-800 hidden lg:flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-purple-300 truncate" title={isPlaylistDirty ? `${playlistName} (modificada)` : playlistName}>
              {isPlaylistDirty ? `${playlistName.replace(" *", "")} *` : playlistName}
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={handleSavePlaylist} title="Guardar playlist" className="text-gray-400 hover:text-purple-400 transition-colors">
                <SaveIcon size={20} />
              </button>
              <button onClick={handleLoadPlaylist} title="Cargar playlist" className="text-gray-400 hover:text-purple-400 transition-colors">
                <FolderOpenIcon size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 -mr-2 pr-2
                          [&::-webkit-scrollbar]:w-2
                          [&::-webkit-scrollbar-track]:bg-transparent
                          [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
            {playQueue.length > 0 ? (
              playQueue.map((song: any) => (
                <div 
                  key={`queue-${song.id}`} 
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, String(song.id))}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => handleDrop(e, String(song.id))}
                  className={`group flex items-center justify-between p-2 rounded-md transition-all duration-200 cursor-grab active:cursor-grabbing 
                              ${currentNode?.value.id === song.id ? 'bg-purple-900/40' : 'hover:bg-gray-800'}
                              ${draggedSongId === String(song.id) ? 'opacity-50' : ''}`}
                >
                  <div className="truncate">
                    <p className={`text-sm font-semibold ${currentNode?.value.id === song.id ? 'text-purple-400' : 'text-white'}`}>{song.title}</p>
                    <p className="text-xs text-gray-400">{song.artist}</p>
                  </div>
                  <button 
                    onClick={() => handleRemoveFromQueue(String(song.id))}
                    className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon size={18} />
                  </button>
                </div>
              ))
            ) : null}
            {playQueue.length > 0 ? (
              <div 
                className="h-10 text-center text-xs text-gray-600 flex items-center justify-center border-t border-dashed border-gray-700 mt-2"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => handleDrop(e, null)}
              >
                Fin de la cola<br /> (arrastra para reordenar)
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-500 text-sm">
                <p>Añade canciones desde la biblioteca para empezar.</p>
              </div>
            )}
          </div>
        </aside>
      </main>

      <footer className="flex-shrink-0 w-full h-24 bg-gray-900 shadow-2xl flex items-center justify-between px-4 sm:px-6 border-t border-purple-900 z-10">
        <div className="text-white w-full flex flex-col sm:flex-row items-center justify-between">
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />
          
          <div className="sm:w-1/4 flex items-center justify-center sm:justify-start gap-2 w-full sm:order-1">
            <button onClick={toggleShuffle} disabled={isQueueEmpty} className={`group rounded-full p-2 transition-colors relative ${isShuffle ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400 hover:bg-white/10'} disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent`} title="Aleatorio">              
              <ShuffleIcon />
              {isShuffle && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"></div>}
            </button>
            <button onClick={prevSong} disabled={!currentSong} className="rounded-full p-2 text-gray-400 hover:bg-white/10 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Anterior">
              <PrevIcon />
            </button>
            <button onClick={togglePlay} disabled={isQueueEmpty && filteredLibrary.length === 0} className="bg-purple-600 rounded-full p-3 text-white hover:bg-purple-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed" title={isPlaying ? 'Pausar' : 'Reproducir'}>
              {isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
            </button>
            <button onClick={nextSong} disabled={!currentSong} className="rounded-full p-2 text-gray-400 hover:bg-white/10 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Siguiente">
              <NextIcon />
            </button>
            <button onClick={cycleRepeatMode} disabled={isQueueEmpty} className={`group rounded-full p-2 transition-colors relative ${repeatMode !== 'none' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400 hover:bg-white/10'} disabled:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent`} title="Repetir">
              {getRepeatIcon(repeatMode)}
              {repeatMode !== 'none' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"></div>}
            </button>
          </div>

          <div className="sm:w-1/2 flex items-center gap-3 w-full sm:order-2 order-1 mt-2 sm:mt-0">
            <span className="text-xs text-gray-400 w-12 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 group">
              <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-gray-700 rounded-full pointer-events-none group-hover:h-1.5 transition-all duration-200"></div>
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-purple-500 pointer-events-none group-hover:h-1.5 transition-all duration-200"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              ></div>
              <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className={`w-full h-1 bg-transparent rounded-full appearance-none cursor-pointer group-hover:h-1.5 transition-all duration-200
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:scale-0 group-hover:[&::-webkit-slider-thumb]:scale-100 transition-transform duration-200`}
              />
            </div>
            <span className="text-xs text-gray-400 w-12 text-left">{formatTime(duration)}</span>
          </div>

          <div className="sm:w-1/4 flex items-center justify-end gap-4 w-full sm:order-3 order-2 mt-2 sm:mt-0">            
            <div className="flex items-center gap-2 w-full max-w-[150px] group" title="Volumen">
              <button onClick={toggleMute} className={`transition-colors ${isMuted ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}>
                {isMuted ? (
                  <MutedIcon />
                ) : (
                  <VolumeIcon />
                )}
              </button>
              <div className="relative flex-1">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-gray-700 rounded-full pointer-events-none group-hover:h-1.5 transition-all duration-200"></div>
                <div 
                  className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full bg-purple-500 pointer-events-none group-hover:h-1.5 transition-all duration-200"
                  style={{ width: `${volume * 100}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className={`w-full h-1 bg-transparent rounded-full appearance-none cursor-pointer group-hover:h-1.5 transition-all duration-200
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:scale-0 group-hover:[&::-webkit-slider-thumb]:scale-100 transition-transform duration-200`}
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
