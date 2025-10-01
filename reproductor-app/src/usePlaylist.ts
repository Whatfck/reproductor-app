import { useState, useCallback, useMemo } from 'react';
import type { Song } from './useLibrary';
import { DoublyLinkedList, Node } from './DoublyLinkedList';

export type RepeatMode = 'none' | 'all' | 'one';

export function usePlaylist() {
  const [playQueue, setPlayQueue] = useState(() => new DoublyLinkedList());
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');

  const currentSong = useMemo(() => currentNode?.value ?? null, [currentNode]);
  const playQueueAsArray = useMemo(() => playQueue.toArray(), [playQueue]);

  const playNode = useCallback((node: Node | null) => {
    setCurrentNode(node);
  }, []);

  const clearCurrentNode = useCallback(() => {
    setCurrentNode(null);
  }, []);

  const nextSong = useCallback(() => {
    if (!currentNode) return;

    if (isShuffle) {
      const randomNode = playQueue.getRandomNode(currentNode);
      playNode(randomNode);
      return;
    }

    if (currentNode.next) {
      playNode(currentNode.next);
    } else {
      // Es la última canción
      if (repeatMode === 'all') {
        playNode(playQueue.head);
      } else {
        // 'none' o 'one', se detiene al final de la cola.
        clearCurrentNode();
      }
    }
  }, [currentNode, isShuffle, playQueue, repeatMode, playNode, clearCurrentNode]);

  const prevSong = useCallback(() => {
    if (!currentNode) return;

    if (isShuffle) {
      const randomNode = playQueue.getRandomNode(currentNode);
      playNode(randomNode);
      return;
    }

    if (currentNode.prev) {
      playNode(currentNode.prev);
    }
  }, [currentNode, isShuffle, playNode, playQueue]);

  const playSongNow = useCallback((song: Song) => {
    if (playQueue.isEmpty()) {
      const newNode = playQueue.addLast(song);
      setPlayQueue(new DoublyLinkedList()); // Trigger re-render
      playNode(newNode);
    }
  }, [playQueue, playNode]);

  const addToQueue = useCallback((song: Song) => {
    const existingNode = playQueue.findNodeBySongId(String(song.id));
    if (existingNode) return; // Evitar duplicados

    const newNode = playQueue.addLast(song);
    if (playQueue.size === 1) {
      playNode(newNode);
    }
    // Clonar para forzar la actualización del estado en React
    const newQueue = Object.assign(new DoublyLinkedList(), playQueue);
    newQueue.head = playQueue.head;
    newQueue.tail = playQueue.tail;
    newQueue.size = playQueue.size;
    setPlayQueue(newQueue);
  }, [playQueue, playNode]);

  const removeFromQueue = useCallback((songId: string) => {
    const nodeToRemove = playQueue.findNodeBySongId(songId);
    if (!nodeToRemove) return;

    let nextNodeToPlay: Node | null = null;
    if (nodeToRemove === currentNode) {
      if (isShuffle) {
        nextNodeToPlay = playQueue.getRandomNode(currentNode);
      } else {
        nextNodeToPlay = currentNode.next ?? playQueue.head;
      }
    }

    playQueue.removeNode(nodeToRemove);

    if (nodeToRemove === currentNode) {
      playNode(nextNodeToPlay);
    }

    const newQueue = Object.assign(new DoublyLinkedList(), playQueue);
    newQueue.head = playQueue.head;
    newQueue.tail = playQueue.tail;
    newQueue.size = playQueue.size;
    setPlayQueue(newQueue);
  }, [playQueue, currentNode, isShuffle, playNode]);

  const reorderQueue = useCallback((draggedSongId: string, targetSongId: string | null) => {
    const draggedNode = playQueue.findNodeBySongId(draggedSongId);
    const targetNode = targetSongId ? playQueue.findNodeBySongId(targetSongId) : null;

    if (!draggedNode) return;
    if (targetSongId && !targetNode) return; // Si hay un ID de destino, el nodo debe existir
    if (draggedNode === targetNode) return;
    
    playQueue.reorder(draggedNode, targetNode);

    // Clonar para forzar la actualización del estado en React
    const newQueue = Object.assign(new DoublyLinkedList(), playQueue);
    newQueue.head = playQueue.head;
    newQueue.tail = playQueue.tail;
    newQueue.size = playQueue.size;
    setPlayQueue(newQueue);
  }, [playQueue]);

  const clearQueue = useCallback(() => {
    const newQueue = new DoublyLinkedList();
    setPlayQueue(newQueue);
    playNode(null);
  }, [playNode]);

  const loadQueue = useCallback((songs: Song[]) => {
    const newQueue = new DoublyLinkedList();
    songs.forEach(song => {
      newQueue.addLast(song);
    });

    const newClonedQueue = Object.assign(new DoublyLinkedList(), newQueue);
    newClonedQueue.head = newQueue.head;
    newClonedQueue.tail = newQueue.tail;
    newClonedQueue.size = newQueue.size;
    setPlayQueue(newClonedQueue);
    playNode(newClonedQueue.head);
  }, [playNode]);

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode(prev => (prev === 'all' ? 'one' : prev === 'one' ? 'none' : 'all'));
  }, []);

  return {
    currentSong,
    playQueue: playQueueAsArray,
    isQueueEmpty: playQueue.isEmpty(),
    currentNode,
    clearCurrentNode,
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
  };
}