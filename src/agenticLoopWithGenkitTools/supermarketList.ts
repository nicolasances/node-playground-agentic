export class SupermarketList {
    private readonly items: string[] = ["Bread", "Butter", "Eggs", "Greek yogurt"];

    getList(): string[] {
        return [...this.items];
    }

    addItem(item: string): void {
        this.items.push(item);
    }
}
