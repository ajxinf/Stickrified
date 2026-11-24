import { Composition } from "remotion";
import { CastLineup, CloseUp } from "./CastLineup";
import { CharacterTest } from "./CharacterTest";
import { MOTION_TEST_FRAMES, MotionTest } from "./MotionTest";
import { CharacterLineup } from "./CharacterLineup";
import { CastSheet } from "./CastSheet";
import { ExpressionSheet } from "./ExpressionSheet";
import { TurnaroundSheet } from "./TurnaroundSheet";
import { BrandBanner, BrandCoverFb, BrandPfp } from "./Brand";
import { ChannelPfp } from "./ChannelPfp";
import { ToonTest } from "./ToonTest";
import { PresetWide, StreetMedium, StreetWide } from "./StreetShots";
import { SupermarketMedium, SupermarketNight, SupermarketWide } from "./Supermarket";
import { PRESETS, PresetName } from "../kit/toon/build/presets";
import { PipelineTest } from "./videos/_pipeline-test/Video";
import { PipelineTest2 } from "./videos/_pipeline-test-2/Video";
import { FRAMES as PT2_FRAMES } from "./videos/_pipeline-test-2/story";
import { STRESS_FRAMES, StressTest } from "./videos/_stress-test/Video";
import { VISUAL_TEST_FRAMES, VisualTest } from "./videos/_visual-test/Video";
import { LOOK_TEST_R27_FRAMES, LookTestR27 } from "./videos/_look-test-r27/Video";
import { CHAR_TEST_FRAMES, CharTest } from "./videos/_char-test/Video";
import { TRAPPED_FRAMES, TrappedInThisWorld } from "./videos/trapped-in-this-world/Video";
import { GTA_FRAMES, GtaStartedAsRaceNChase } from "./videos/gta-started-as-race-n-chase/Video";
import { LOOK_FRAMES, MOON_FRAMES, MoonDisappearedTonight, MoonLookTest } from "./videos/moon-disappeared-tonight/Video";
import { PF_LOOK_FRAMES, PromiseLookTest } from "./videos/promise-flowers/LookTest";
import { PROMISE_FRAMES, PromiseFlowers } from "./videos/promise-flowers/Video";
import { PromiseTurnSheet } from "./videos/promise-flowers/TurnSheet";
import { AntwerpHeist, HEIST_FRAMES } from "./videos/antwerp-diamond-heist/Video";
import { SUN_FRAMES, SunNeverSets } from "./videos/sun-never-sets/Video";
import { FollowersLookTest } from "./videos/followers-make-you-tall/LookTest";
import { withQAFrames } from "../kit/toon/QAFrames";
// episodes take `qaFrames` (stills.mjs --batch: all review stills in one render pass)
const PromiseFlowersQA = withQAFrames(PromiseFlowers);
const AntwerpHeistQA = withQAFrames(AntwerpHeist);
const SunNeverSetsQA = withQAFrames(SunNeverSets);
import { ZOMBIE_FRAMES, ZombieSupermarket } from "./videos/zombie-supermarket-30-days/Video";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ToonTest" component={ToonTest} fps={30} durationInFrames={150} width={1080} height={1920} />
    <Composition id="CharacterTest" component={CharacterTest} fps={30} durationInFrames={240} width={1080} height={1920} />
    <Composition id="MotionTest" component={MotionTest} fps={30} durationInFrames={MOTION_TEST_FRAMES} width={1080} height={1920} />
    <Composition id="CastLineup"component={CastLineup} fps={30} durationInFrames={30} width={1080} height={1920} />
    <Composition id="CloseUp" component={CloseUp} fps={30} durationInFrames={30} width={1080} height={1920} />
    <Composition id="StreetWide" component={StreetWide} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="StreetMedium" component={StreetMedium} fps={30} durationInFrames={90} width={1080} height={1920} />
    {(Object.keys(PRESETS) as PresetName[]).map((n) => (
      <Composition key={n} id={`Preset-${n.replace(/_/g, "-")}`} component={PresetWide} defaultProps={{ name: n }} fps={30} durationInFrames={90} width={1080} height={1920} />
    ))}
    <Composition id="SupermarketWide" component={SupermarketWide} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="SupermarketMedium" component={SupermarketMedium} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="SupermarketNight" component={SupermarketNight} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="ExpressionSheet" component={ExpressionSheet} fps={30} durationInFrames={1} width={1080} height={1920} />
    <Composition id="TurnaroundSheet" component={TurnaroundSheet} fps={30} durationInFrames={1} width={1920} height={1080} />
    <Composition id="BrandPfp" component={BrandPfp} fps={30} durationInFrames={1} width={1080} height={1080} />
    <Composition id="BrandBanner" component={BrandBanner} fps={30} durationInFrames={1} width={2560} height={1440} />
    <Composition id="BrandCoverFb" component={BrandCoverFb} fps={30} durationInFrames={1} width={1640} height={924} />
    <Composition id="ChannelPfp" component={ChannelPfp} fps={30} durationInFrames={1} width={2048} height={2048} />
    <Composition id="CharacterLineup" component={CharacterLineup} fps={30} durationInFrames={1} width={1920} height={1080} />
    <Composition id="HordeLineup" component={CharacterLineup} defaultProps={{ horde: true }} fps={30} durationInFrames={1} width={1920} height={1080} />
    <Composition id="CastSheet"component={CastSheet} fps={30} durationInFrames={1} width={1080} height={1920} />
    <Composition id="PipelineTest" component={PipelineTest} fps={30} durationInFrames={450} width={1080} height={1920} />
      <Composition id="PipelineTest2" component={PipelineTest2} fps={30} durationInFrames={PT2_FRAMES} width={1080} height={1920} />
      <Composition id="StressTest" component={StressTest} fps={30} durationInFrames={STRESS_FRAMES} width={1080} height={1920} />
      <Composition id="GtaStartedAsRaceNChase" component={GtaStartedAsRaceNChase} fps={30} durationInFrames={GTA_FRAMES} width={1080} height={1920} />
      <Composition id="MoonDisappearedTonight" component={MoonDisappearedTonight} fps={30} durationInFrames={MOON_FRAMES} width={1080} height={1920} />
      <Composition id="MoonLookTest" component={MoonLookTest} fps={30} durationInFrames={LOOK_FRAMES} width={1080} height={1920} />
      <Composition id="TrappedInThisWorld" component={TrappedInThisWorld} fps={30} durationInFrames={TRAPPED_FRAMES} width={1080} height={1920} />
      <Composition id="SunNeverSets" component={SunNeverSetsQA} fps={30} durationInFrames={SUN_FRAMES} width={1080} height={1920} />
      <Composition id="FollowersLookTest" component={FollowersLookTest} fps={30} durationInFrames={4} width={1080} height={1920} />
      <Composition id="AntwerpHeist" component={AntwerpHeistQA} fps={30} durationInFrames={HEIST_FRAMES} width={1080} height={1920} />
      <Composition id="PromiseFlowers" component={PromiseFlowersQA} fps={30} durationInFrames={PROMISE_FRAMES} width={1080} height={1920} />
      <Composition id="PromiseTurnSheet" component={PromiseTurnSheet} fps={30} durationInFrames={1} width={1960} height={2240} />
      <Composition id="PromiseLookTest" component={PromiseLookTest} fps={30} durationInFrames={PF_LOOK_FRAMES} width={1080} height={1920} />
      <Composition id="CharTest" component={CharTest} fps={30} durationInFrames={CHAR_TEST_FRAMES} width={1080} height={1920} />
      <Composition id="LookTestR27" component={LookTestR27} fps={30} durationInFrames={LOOK_TEST_R27_FRAMES} width={1080} height={1920} />
      <Composition id="VisualTest" component={VisualTest} fps={30} durationInFrames={VISUAL_TEST_FRAMES} width={1080} height={1920} />
      <Composition id="ZombieSupermarket" component={ZombieSupermarket} fps={30} durationInFrames={ZOMBIE_FRAMES} width={1080} height={1920} />
  </>
);
