import { motion } from "framer-motion";

export function ConversationSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 rounded-lg bg-muted/50 animate-pulse"
        >
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-muted-foreground/20 rounded mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
              <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          className="flex gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-muted-foreground/20 rounded w-full animate-pulse" />
            <div className="h-4 bg-muted-foreground/20 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-muted-foreground/20 rounded w-4/6 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6"
      >
        <div className="w-24 h-24 rounded-full bg-muted-foreground/20 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-muted-foreground/20 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2 animate-pulse" />
        </div>
      </motion.div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-1/4 animate-pulse" />
            <div className="h-10 bg-muted-foreground/20 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
