import { Users } from "lucide-react";

interface Participant {
  socketId: string;
  username: string;
}

interface ParticipantsListProps {
  participants: Participant[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <div className="flex -space-x-2 overflow-hidden items-center">
      {participants.map((user) => (
        <div
          key={user.socketId}
          className="relative group cursor-pointer"
          title={user.username}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-[#0a0a0a] flex items-center justify-center text-xs font-bold text-white uppercase select-none">
            {user.username.slice(0, 2)}
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
            {user.username}
          </div>
        </div>
      ))}
      <div
        className="w-8 h-8 rounded-full bg-gray-800 ring-2 ring-[#0a0a0a] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors cursor-pointer"
        title="View all members"
      >
        <Users className="w-4 h-4" />
      </div>
    </div>
  );
}
