
class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.size = 0;
    }

    // Display Linked List
    printList() {
        let current = this.head;
        let result = [];

        while (current !== null) {
            result.push(current.data);
            current = current.next;
        }

        console.log(result.join(" -> ") + " -> null");
    }

    // Insert at beginning
    insertAtBeginning(data) {
        const newNode = new Node(data);

        newNode.next = this.head;
        this.head = newNode;

        this.size++;
    }

    // Insert at end
    insertAtEnd(data) {
        const newNode = new Node(data);

        if (this.head === null) {
            this.head = newNode;
            this.size++;
            return;
        }

        let current = this.head;

        while (current.next !== null) {
            current = current.next;
        }

        current.next = newNode;
        this.size++;
    }

    // Insert at a specific index
    insertAtIndex(index, data) {
        if (index < 0 || index > this.size) {
            console.log("Invalid index");
            return;
        }

        if (index === 0) {
            this.insertAtBeginning(data);
            return;
        }

        const newNode = new Node(data);
        let current = this.head;

        for (let i = 0; i < index - 1; i++) {
            current = current.next;
        }

        newNode.next = current.next;
        current.next = newNode;

        this.size++;
    }

    // Delete from beginning
    deleteFromBeginning() {
        if (this.head === null) {
            console.log("List is empty");
            return;
        }

        this.head = this.head.next;
        this.size--;
    }

    // Delete from end
    deleteFromEnd() {
        if (this.head === null) {
            console.log("List is empty");
            return;
        }

        if (this.head.next === null) {
            this.head = null;
            this.size--;
            return;
        }

        let current = this.head;

        while (current.next.next !== null) {
            current = current.next;
        }

        current.next = null;
        this.size--;
    }

    // Delete at a specific index
    deleteAtIndex(index) {
        if (index < 0 || index >= this.size) {
            console.log("Invalid index");
            return;
        }

        if (index === 0) {
            this.deleteFromBeginning();
            return;
        }

        let current = this.head;

        for (let i = 0; i < index - 1; i++) {
            current = current.next;
        }

        current.next = current.next.next;

        this.size--;
    }
    // Reverse the linked list
    reverse() {
        let prev = null;
        let current = this.head;
        let next = null;

        while (current !== null) {
            
        }
    }
}

// Testing
const list = new LinkedList();

list.insertAtEnd(10);
list.insertAtEnd(20);
list.insertAtEnd(30);
list.insertAtEnd(40);

list.printList();
// 10 -> 20 -> 30 -> 40 -> null

list.insertAtBeginning(5);
list.printList();
// 5 -> 10 -> 20 -> 30 -> 40 -> null

list.insertAtIndex(2, 15);
list.printList();
// 5 -> 10 -> 15 -> 20 -> 30 -> 40 -> null

list.deleteFromBeginning();
list.printList();
// 10 -> 15 -> 20 -> 30 -> 40 -> null

list.deleteFromEnd();
list.printList();
// 10 -> 15 -> 20 -> 30 -> null

list.deleteAtIndex(1);
list.printList();
// 10 -> 20 -> 30 -> null

console.log("Size:", list.size);
