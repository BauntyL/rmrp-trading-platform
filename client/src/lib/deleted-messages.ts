// Глобальное хранилище удаленных модераторами сообщений
class DeletedMessagesStore {
  private deletedMessages = new Set<number>();
  private listeners = new Set<() => void>();

  add(messageId: number) {
    this.deletedMessages.add(messageId);
    this.notifyListeners();
  }

  has(messageId: number): boolean {
    return this.deletedMessages.has(messageId);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const deletedMessagesStore = new DeletedMessagesStore();