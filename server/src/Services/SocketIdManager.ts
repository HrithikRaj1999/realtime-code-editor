
export default class SocketIdManager {
  private static instance: SocketIdManager;
  private userSocketIdMap: { [key: string]: string };

  private constructor() {
      this.userSocketIdMap = {};
  }

  public static getInstance(): SocketIdManager {
      if (!SocketIdManager.instance) {
          SocketIdManager.instance = new SocketIdManager();
      }
      return SocketIdManager.instance;
  }

  public addUser(socketId: string, username: string): void {
      this.userSocketIdMap[socketId] = username;
  }

  public removeUser(socketId: string): void {
      delete this.userSocketIdMap[socketId];
  }
  public getUserName(socketId: string): string {
    return this.userSocketIdMap[socketId];
  }
}
