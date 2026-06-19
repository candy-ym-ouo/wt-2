<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameStore, canStartDevelop, statistics } from './stores/gameStore';
  import { generateBaseScene, applyDevelopment, renderToCanvas, createThumbnail } from './utils/renderEngine';
  import type { RenderedImageData } from './utils/renderEngine';
  import { calculateScore } from './utils/scoring';
  import { PHOTO_SUBJECTS, FILM_STOCKS } from './data/gameData';
  import { generateId } from './utils/math';
  import type { ProcessedPhoto, GameState, DevParams, CanvasMode, GamePhase } from './types/game';

  import SubjectList from './components/SubjectList.svelte';
  import FilmList from './components/FilmList.svelte';
  import PhotoCanvas from './components/PhotoCanvas.svelte';
  import ParamPanel from './components/ParamPanel.svelte';
  import DevelopPanel from './components/DevelopPanel.svelte';
  import ScorePanel from './components/ScorePanel.svelte';
  import PhotoAlbum from './components/PhotoAlbum.svelte';
  import TutorialGuide from './components/TutorialGuide.svelte';

  let selectedSubjectId: string | null = null;
  let selectedFilmId: string = FILM_STOCKS[0].id;
  let lastProcessedPhoto: ProcessedPhoto | null = null;
  let developAnimFrame: number | null = null;
  let renderCanvas: HTMLCanvasElement;
  let renderCtx: CanvasRenderingContext2D;

  let unsubscribe: () => void;
  let currentState: GameState;

  $: phase = $gameStore.phase;
  $: currentSubject = $gameStore.currentSubject;
  $: currentFilm = $gameStore.currentFilm;
  $: currentParams = $gameStore.currentParams;
  $: developmentProgress = $gameStore.developmentProgress;
  $: isDeveloping = $gameStore.isDeveloping;
  $: tutorialStep = $gameStore.tutorialStep;
  $: processedPhotos = $gameStore.processedPhotos;
  $: selectedAlbumPhoto = $gameStore.selectedAlbumPhoto;

  let canvasMode: CanvasMode;
  $: canvasMode = phase === 'develop' ? 'developing' : (phase === 'result' ? 'final' : 'preview');
  $: isParamDisabled = phase === 'develop' || phase === 'result';

  function handleSelect(e: Event) {
    const ce = e as CustomEvent<string>;
    gameStore.setSubject(ce.detail);
    selectedSubjectId = ce.detail;
  }

  function handleSelectFilm(e: Event) {
    const ce = e as CustomEvent<string>;
    gameStore.setFilm(ce.detail);
    selectedFilmId = ce.detail;
  }

  onMount(() => {
    document.addEventListener('select', handleSelect);
    document.addEventListener('selectFilm', handleSelectFilm);

    const tmp = document.createElement('canvas');
    tmp.width = 480;
    tmp.height = 640;
    renderCanvas = tmp;
    renderCtx = tmp.getContext('2d')!;
  });

  onDestroy(() => {
    document.removeEventListener('select', handleSelect);
    document.removeEventListener('selectFilm', handleSelectFilm);
    if (developAnimFrame) cancelAnimationFrame(developAnimFrame);
  });

  function handleUpdateParams(params: Partial<DevParams>) {
    gameStore.updateParams(params);
  }

  function handleReset() {
    gameStore.resetParams();
  }

  function handleStartDevelop() {
    if (!currentSubject) return;
    gameStore.startDevelopment();
    animateDevelopment();
  }

  function handleCancelDevelop() {
    if (developAnimFrame) {
      cancelAnimationFrame(developAnimFrame);
      developAnimFrame = null;
    }
    gameStore.updateDevelopmentProgress(0);
    gameStore.setPhase('select');
  }

  function animateDevelopment() {
    const duration = 5000;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      gameStore.updateDevelopmentProgress(eased);

      if (progress < 1) {
        developAnimFrame = requestAnimationFrame(tick);
      } else {
        developAnimFrame = null;
        finalizeDevelopment();
      }
    }
    developAnimFrame = requestAnimationFrame(tick);
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function finalizeDevelopment() {
    if (!currentSubject) return;

    const subject = currentSubject;
    const film = currentFilm;
    const params = currentParams;
    const isColorFilm = film.color === 'color';

    const baseScene = generateBaseScene(subject);
    const finalImage = applyDevelopment(
      baseScene,
      {
        exposure: params.exposure,
        developmentTime: params.developmentTime,
        temperature: params.temperature,
        agitation: params.agitation,
        contrast: params.contrast,
        saturation: params.saturation,
        dilution: params.dilution,
        isColorFilm,
        filmBaseContrast: film.baseContrast,
        filmBaseSaturation: film.baseSaturation,
        grainSize: film.grainSize,
        subjectBaseBrightness: subject.baseBrightness,
        seed: subject.seed,
        progress: 1
      },
      false
    );

    renderToCanvas(renderCtx, finalImage);
    const imgUrl = createThumbnail(renderCtx, finalImage, 480, 640);

    const scoreDetails = calculateScore(subject, params, finalImage, isColorFilm);

    const photo: ProcessedPhoto = {
      id: generateId(),
      subjectId: subject.id,
      filmId: film.id,
      params: { ...params },
      score: scoreDetails.overall,
      details: scoreDetails,
      imageDataUrl: imgUrl,
      timestamp: Date.now()
    };

    lastProcessedPhoto = photo;
    gameStore.finishDevelopment(photo);
  }

  function handleCanvasRendered(e: CustomEvent<{ url: string; image: RenderedImageData }>) {
  }

  function handleNewPhoto() {
    lastProcessedPhoto = null;
    gameStore.updateDevelopmentProgress(0);
    gameStore.resetParams();
    gameStore.setPhase('select');
  }

  function handleTutorialNext() {
    gameStore.nextTutorialStep();
  }

  function handleTutorialPrev() {
    gameStore.prevTutorialStep();
  }

  function handleTutorialGoTo(step: number) {
    gameStore.setTutorialStep(step);
  }

  function handleParamUpdate(e: CustomEvent<any>) {
    handleUpdateParams(e.detail);
  }

  function handlePhotoDelete(e: CustomEvent<string>) {
    handleDeletePhoto(e.detail);
  }

  function handleGoTo(e: CustomEvent<number>) {
    handleTutorialGoTo(e.detail);
  }

  function handleScoreNewPhoto() {
    handleNewPhoto();
  }

  function handleScoreOpenAlbum() {
    gameStore.openAlbum();
  }

  function handleTutorialSkip() {
    gameStore.skipTutorial();
  }

  function handleDeletePhoto(id: string) {
    gameStore.deletePhoto(id);
  }

  function handleAlbumClose() {
    gameStore.goToSelect();
  }
</script>

<div class="app-root">
  <header class="app-header">
    <div class="logo-area">
      <span class="logo-icon">🎞</span>
      <div class="logo-text">
        <h1 class="app-title">胶片暗房</h1>
        <span class="app-subtitle">DARKROOM SIMULATOR</span>
      </div>
    </div>
    <div class="header-actions">
      <button
        class="header-btn album"
        on:click={() => gameStore.openAlbum()}
        title="我的相册"
      >
        <span>📚</span>
        {#if $statistics.total > 0}
          <span class="badge">{$statistics.total}</span>
        {/if}
      </button>
      <button
        class="header-btn help"
        on:click={() => { gameStore.setTutorialStep(0); gameStore.setPhase('tutorial'); }}
        title="教程"
      >
        <span>❓</span>
      </button>
    </div>
  </header>

  <main class="main-layout">
    <section class="left-panel">
      <SubjectList selectedId={selectedSubjectId} />
      <div style="margin-top: 16px;">
        <FilmList selectedId={selectedFilmId} />
      </div>
    </section>

    <section class="center-panel">
      <div class="canvas-section">
        <PhotoCanvas
          subject={currentSubject}
          film={currentFilm}
          params={currentParams}
          progress={developmentProgress}
          showNegative={false}
          mode={canvasMode}
          on:rendered={handleCanvasRendered}
        />
      </div>
      {#if currentSubject && phase !== 'develop'}
        <div class="current-subject-info">
          <span class="subject-label">当前场景：</span>
          <span class="subject-name">{currentSubject.name}</span>
          <span class="film-label">｜胶片：</span>
          <span class="film-name">{currentFilm.name}</span>
        </div>
      {/if}
    </section>

    <section class="right-panel">
      <ParamPanel
        params={currentParams}
        subject={currentSubject}
        disabled={isParamDisabled}
        on:update={handleParamUpdate}
      />
      <div style="margin-top: 16px;">
        <DevelopPanel
          params={currentParams}
          isDeveloping={isDeveloping}
          canDevelop={$canStartDevelop}
          progress={developmentProgress}
          on:startDevelop={handleStartDevelop}
          on:cancelDevelop={handleCancelDevelop}
          on:reset={handleReset}
        />
      </div>
    </section>
  </main>

  {#if phase === 'result' && lastProcessedPhoto}
    <div class="result-overlay" on:click={() => {}}>
      <div class="result-layout">
        <div class="result-image-area">
          <div class="result-frame">
            <img src={lastProcessedPhoto.imageDataUrl} alt="冲洗结果" />
            <div class="corner tl" />
            <div class="corner tr" />
            <div class="corner bl" />
            <div class="corner br" />
          </div>
        </div>
        <div class="result-panel-area">
          <ScorePanel
            photo={lastProcessedPhoto}
            mode="result"
            on:newPhoto={handleScoreNewPhoto}
            on:openAlbum={handleScoreOpenAlbum}
          />
        </div>
      </div>
    </div>
  {/if}

  {#if phase === 'album'}
    <PhotoAlbum
      photos={processedPhotos}
      statistics={$statistics}
      on:close={handleAlbumClose}
      on:delete={handlePhotoDelete}
    />
  {/if}

  {#if phase === 'tutorial'}
    <TutorialGuide
      currentStep={tutorialStep}
      on:next={handleTutorialNext}
      on:prev={handleTutorialPrev}
      on:skip={handleTutorialSkip}
      on:goTo={handleGoTo}
    />
  {/if}

  <footer class="app-footer">
    <span>💡 提示：暗房艺术在于平衡曝光、时间与温度，细微的参数差异会带来截然不同的效果</span>
  </footer>
</div>

<style>
  .app-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 16px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    margin-bottom: 20px;
    background: linear-gradient(90deg, rgba(45, 26, 18, 0.7), rgba(26, 15, 10, 0.5));
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 12px;
    backdrop-filter: blur(8px);
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .logo-icon {
    font-size: 36px;
    filter: drop-shadow(0 2px 8px rgba(200, 150, 80, 0.3));
  }

  .logo-text {
    display: flex;
    flex-direction: column;
  }

  .app-title {
    font-size: 22px;
    font-weight: 600;
    color: #e8c890;
    margin: 0;
    letter-spacing: 4px;
    background: linear-gradient(90deg, #f0d8a8, #d4a574);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .app-subtitle {
    font-size: 10px;
    color: #7a6a55;
    letter-spacing: 4px;
    margin-top: 2px;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .header-btn {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(139, 90, 43, 0.15);
    border: 1px solid rgba(139, 90, 43, 0.25);
    color: #c8a878;
    font-size: 20px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-btn:hover {
    background: rgba(139, 90, 43, 0.3);
    transform: translateY(-2px);
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: linear-gradient(135deg, #c86060, #a04040);
    color: #fff;
    font-size: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 300px 1fr 320px;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 1200px) {
    .main-layout {
      grid-template-columns: 260px 1fr 280px;
      gap: 14px;
    }
  }

  @media (max-width: 960px) {
    .main-layout {
      grid-template-columns: 1fr;
    }
    .left-panel, .right-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .left-panel > :nth-child(n) { margin-top: 0 !important; }
  }

  @media (max-width: 640px) {
    .left-panel, .right-panel {
      grid-template-columns: 1fr;
    }
  }

  .left-panel, .center-panel, .right-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .canvas-section {
    padding: 20px;
    background: linear-gradient(180deg, rgba(45, 26, 18, 0.5) 0%, rgba(20, 12, 8, 0.6) 100%);
    border: 1px solid rgba(139, 90, 43, 0.2);
    border-radius: 16px;
    backdrop-filter: blur(6px);
  }

  .current-subject-info {
    margin-top: 14px;
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    text-align: center;
    font-size: 12px;
    color: #8a7a5a;
    letter-spacing: 0.5px;
  }

  .subject-label, .film-label {
    color: #6a5a45;
  }

  .subject-name, .film-name {
    color: #c8a878;
    font-weight: 500;
  }

  .result-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30px;
    animation: fadeIn 0.4s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .result-layout {
    display: grid;
    grid-template-columns: minmax(300px, 1fr) minmax(350px, 440px);
    gap: 28px;
    max-width: 1000px;
    width: 100%;
    align-items: start;
  }

  @media (max-width: 850px) {
    .result-layout {
      grid-template-columns: 1fr;
      max-height: 92vh;
      overflow-y: auto;
    }
  }

  .result-image-area {
    display: flex;
    justify-content: center;
  }

  .result-frame {
    position: relative;
    width: 100%;
    max-width: 420px;
    aspect-ratio: 3 / 4;
    background: #0a0503;
    border-radius: 6px;
    overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(139, 90, 43, 0.3),
      0 12px 40px rgba(0, 0, 0, 0.7);
    animation: frameReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes frameReveal {
    from { transform: scale(0.9) rotate(-2deg); opacity: 0; }
    to { transform: scale(1) rotate(0); opacity: 1; }
  }

  .result-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    animation: photoFade 1s ease 0.2s both;
  }

  @keyframes photoFade {
    from { filter: brightness(0.2) sepia(0.8); }
    to { filter: brightness(1) sepia(0); }
  }

  .corner {
    position: absolute;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(180, 140, 90, 0.5);
    border-width: 0;
  }
  .corner.tl { top: 10px; left: 10px; border-top-width: 2px; border-left-width: 2px; }
  .corner.tr { top: 10px; right: 10px; border-top-width: 2px; border-right-width: 2px; }
  .corner.bl { bottom: 10px; left: 10px; border-bottom-width: 2px; border-left-width: 2px; }
  .corner.br { bottom: 10px; right: 10px; border-bottom-width: 2px; border-right-width: 2px; }

  .app-footer {
    margin-top: 20px;
    padding: 12px 20px;
    text-align: center;
    font-size: 11px;
    color: #5a4a35;
    letter-spacing: 1px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }
</style>
