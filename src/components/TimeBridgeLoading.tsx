"use client";

import TimeBridgeLogo from "./TimeBridgeLogo";

type Props = {
  message?: string;
};

export default function TimeBridgeLoading({ message = "A moment..." }: Props) {
  return (
    <div className="tb-loading">
      <TimeBridgeLogo size="md" variant="light" showWordmark={false} animated={true} />
      <p className="tb-loading-text">{message}</p>
    </div>
  );
}
