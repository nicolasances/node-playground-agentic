export class SupermarketList {
    private readonly items: string[] = [];

    getList(): string[] {
        return [...this.items];
    }

    addItem(item: string): void {
        this.items.push(item);
    }
}
