import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { formatIntervalSeconds } from "@/src/utils/dates";
import { PLAYBACK_SPEEDS } from "@/src/components/trace/contexts/playheadStore";
import {
  useActiveRunReplayEvent,
  useRunReplayActions,
  useRunReplayStore,
} from "./RunReplayProvider";

export function ReplayToolbar() {
  const actions = useRunReplayActions();
  const isPlaying = useRunReplayStore((state) => state.isPlaying);
  const speed = useRunReplayStore((state) => state.playbackSpeed);
  const position = useRunReplayStore((state) => state.playheadSec);
  const duration = useRunReplayStore((state) => state.traceDuration);
  const event = useActiveRunReplayEvent();
  return (
    <div
      className="bg-background/95 flex flex-wrap items-center gap-2 border-b px-3 py-2 backdrop-blur sm:px-4"
      aria-label="Execution replay controls"
    >
      <Badge variant={isPlaying ? "warning" : "outline"}>
        {isPlaying ? "Replaying" : "Replay paused"}
      </Badge>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={actions.stepBack}
          aria-label="Previous replay event"
          title="Previous event"
        >
          <SkipBack className="size-4" />
        </Button>
        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={isPlaying ? actions.pause : actions.play}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={actions.stepForward}
          aria-label="Next replay event"
          title="Next event"
        >
          <SkipForward className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={actions.stop}
          aria-label="Reset replay"
          title="Reset replay"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      <Select
        value={String(speed)}
        onValueChange={(value) => actions.setPlaybackSpeed(Number(value))}
      >
        <SelectTrigger className="h-8 w-20" aria-label="Replay speed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLAYBACK_SPEEDS.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {value}×
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-mono text-xs">
        {formatIntervalSeconds(position, 2)} /{" "}
        {formatIntervalSeconds(duration, 2)}
      </span>
      <span
        className="text-muted-foreground min-w-0 truncate text-xs"
        title={event?.name}
      >
        {event ? `Current: ${event.name}` : "Current: execution start"}
      </span>
    </div>
  );
}
