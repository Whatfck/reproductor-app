import type { Song } from "./useLibrary";

/**
 * Representa un nodo en la lista doblemente enlazada.
 * Cada nodo contiene una canción y punteros al nodo siguiente y anterior.
 */
export class Node {
  value: Song;
  next: Node | null;
  prev: Node | null;

  constructor(value: Song) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

/**
 * Implementación de una lista doblemente enlazada para gestionar la cola de reproducción.
 */
export class DoublyLinkedList {
  head: Node | null;
  tail: Node | null;
  size: number;

  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  /**
   * Comprueba si la lista está vacía.
   * @returns {boolean} `true` si la lista no tiene nodos.
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Añade una canción al final de la lista.
   * @param {Song} value - La canción a añadir.
   * @returns {Node} El nuevo nodo creado.
   */
  addLast(value: Song): Node {
    const newNode = new Node(value);

    if (this.isEmpty()) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      // El '!' asegura a TypeScript que `this.tail` no es nulo en este punto.
      this.tail!.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }

    this.size++;
    return newNode;
  }

  /**
   * Elimina un nodo específico de la lista.
   * @param {Node} nodeToRemove - El nodo a eliminar.
   * @returns {Node | null} El nodo que era la cabeza de la lista, o null si la lista queda vacía.
   */
  removeNode(nodeToRemove: Node): Node | null {
    if (!nodeToRemove) return null;

    // Si el nodo a eliminar tiene un anterior, se actualiza el puntero 'next' de ese anterior.
    if (nodeToRemove.prev) {
      nodeToRemove.prev.next = nodeToRemove.next;
    } else {
      // Si no, el nodo a eliminar era la cabeza (head), así que la nueva cabeza es el siguiente.
      this.head = nodeToRemove.next;
    }

    // Si el nodo a eliminar tiene un siguiente, se actualiza el puntero 'prev' de ese siguiente.
    if (nodeToRemove.next) {
      nodeToRemove.next.prev = nodeToRemove.prev;
    } else {
      // Si no, el nodo a eliminar era la cola (tail), así que la nueva cola es el anterior.
      this.tail = nodeToRemove.prev;
    }

    this.size--;

    // Limpiar los punteros del nodo eliminado para evitar referencias no deseadas.
    nodeToRemove.next = null;
    nodeToRemove.prev = null;

    return this.head;
  }

  /**
   * Reordena la lista moviendo un nodo a una nueva posición.
   * @param {Node} draggedNode - El nodo que se está arrastrando.
   * @param {Node | null} targetNode - El nodo sobre el cual se suelta el `draggedNode`. Si es `null`, se mueve al final.
   */
  reorder(draggedNode: Node, targetNode: Node | null) {
    if (draggedNode === targetNode) return;

    // 1. Desvincular el nodo arrastrado de su posición actual.
    this.removeNode(draggedNode);

    // 2. Insertar el nodo en la nueva posición.
    if (targetNode) {
      // Insertar antes del nodo de destino.
      draggedNode.prev = targetNode.prev;
      draggedNode.next = targetNode;

      if (targetNode.prev) {
        targetNode.prev.next = draggedNode;
      } else {
        // Si el nodo de destino era la cabeza, el nodo arrastrado es la nueva cabeza.
        this.head = draggedNode;
      }
      targetNode.prev = draggedNode;
    } else {
      // Si no hay nodo de destino (targetNode es null), se inserta al final.
      this.tail!.next = draggedNode;
      draggedNode.prev = this.tail;
      this.tail = draggedNode;
      draggedNode.next = null; // Asegurarse de que es el último.
    }

    this.size++; // removeNode decrementa el tamaño, lo restauramos porque solo estamos moviendo.
  }

  /**
   * Busca un nodo en la lista por el ID de la canción.
   * @param {string} songId - El ID de la canción a buscar.
   * @returns {Node | null} El nodo encontrado o `null` si no se encuentra.
   */
  findNodeBySongId(songId: string): Node | null {
    let currentNode = this.head;
    while (currentNode !== null) {
      // Comparamos los IDs como strings para evitar errores de tipo.
      if (String(currentNode.value.id) === songId) {
        return currentNode;
      }
      currentNode = currentNode.next;
    }
    return null;
  }

  /**
   * Convierte la lista enlazada a un array de canciones.
   * @returns {Song[]} Un array con todas las canciones en orden.
   */
  toArray(): Song[] {
    const songs: Song[] = [];
    let currentNode = this.head;
    while (currentNode) {
      songs.push(currentNode.value);
      currentNode = currentNode.next;
    }
    return songs;
  }

  /**
   * Obtiene un nodo aleatorio de la lista, útil para el modo aleatorio (shuffle).
   * @param {Node | null} excludeNode - Un nodo a excluir de la selección aleatoria (opcional).
   * @returns {Node | null} Un nodo aleatorio o `null` si la lista está vacía.
   */
  getRandomNode(excludeNode: Node | null = null): Node | null {
    if (this.isEmpty() || (this.size === 1 && this.head === excludeNode)) {
      return null;
    }

    let randomNode: Node | null;

    do {
      const randomIndex = Math.floor(Math.random() * this.size);
      randomNode = this.head;
      for (let i = 0; i < randomIndex; i++) {
        randomNode = randomNode?.next ?? null;
      }
    } while (randomNode === excludeNode); // Evita repetir la misma canción si es posible.

    return randomNode;
  }
}