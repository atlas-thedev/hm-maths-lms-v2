import React from "react";
import { Composition } from "remotion";
import { HeroLoop } from "./HeroLoop";
export const Root: React.FC = () => (
  <Composition id="HeroLoop" component={HeroLoop} durationInFrames={300} fps={30} width={1920} height={1080} />
);
