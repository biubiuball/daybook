import { getSettings } from "./settings-store";

// The options interface is no longer needed since we pass args directly
class MediaManager {
  private static instance: MediaManager | null = null;

  private activeAudio: HTMLAudioElement | null = null;
  private currentArticleUrl: string | null = null;
  private currentSourceId: string | null = null;
  private isTakeoverActive: boolean = false;
  
  private container: HTMLElement | null = null;
  private audioContainer: HTMLElement | null = null;

  // Desktop UI elements
  private desktopPlayPauseBtn: HTMLElement | null = null;
  private desktopPlayPauseIcon: HTMLElement | null = null;
  private desktopReturnBtn: HTMLElement | null = null;
  private desktopProgressText: HTMLElement | null = null;
  private desktopCloseBtn: HTMLElement | null = null;

  // Event handlers bound to instance
  private onTimeUpdateBound: () => void;
  private onPlayBound: () => void;
  private onPauseBound: () => void;
  private onEndedBound: () => void;
  private onErrorBound: () => void;
  private onSettingsChangeBound: (e: Event) => void;

  private constructor() {
    this.onTimeUpdateBound = this.onTimeUpdate.bind(this);
    this.onPlayBound = this.onPlay.bind(this);
    this.onPauseBound = this.onPause.bind(this);
    this.onEndedBound = this.onEnded.bind(this);
    this.onErrorBound = this.onError.bind(this);
    this.onSettingsChangeBound = this.onSettingsChange.bind(this);

    this.initDOM();
    this.bindEvents();
    
    // Listen to global settings change
    document.addEventListener("daybook:settings-change", this.onSettingsChangeBound);
  }

  public static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager();
    }
    return MediaManager.instance;
  }

  private initDOM() {
    this.container = document.getElementById("daybook-media-manager");
    if (!this.container) return;

    this.audioContainer = this.container.querySelector(".mm-audio-container");

    this.desktopPlayPauseBtn = this.container.querySelector(".mm-btn-play-pause");
    this.desktopPlayPauseIcon = this.container.querySelector(".mm-btn-play-pause .mm-icon-current");
    this.desktopReturnBtn = this.container.querySelector(".mm-btn-return");
    this.desktopProgressText = this.container.querySelector(".mm-progress-text");
    this.desktopCloseBtn = this.container.querySelector(".mm-btn-close");

    // Add desktop hover effects manually (simulating reading controls)
    const btns = this.container.querySelectorAll(".reading-control-btn") as NodeListOf<HTMLElement>;
    btns.forEach(btn => {
      btn.addEventListener("mouseenter", (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty("--pointer-x", `${e.clientX - rect.left}px`);
        btn.style.setProperty("--pointer-y", `${e.clientY - rect.top}px`);
        void btn.offsetHeight; // reflow
        btn.classList.add("is-hovered");
      });
      btn.addEventListener("mouseleave", (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty("--pointer-x", `${e.clientX - rect.left}px`);
        btn.style.setProperty("--pointer-y", `${e.clientY - rect.top}px`);
        btn.classList.remove("is-hovered");
      });
    });
  }

  private bindEvents() {
    const togglePlay = () => {
      if (!this.activeAudio) return;
      if (this.activeAudio.paused) {
        this.activeAudio.play().catch(e => console.warn("MediaManager play rejected:", e));
      } else {
        this.activeAudio.pause();
      }
    };

    const returnToArticle = () => {
      if (this.currentArticleUrl) {
        (window as any).daybookNavigate(this.currentArticleUrl);
      }
    };

    const closePlayback = () => {
      this.stopAndRelease();
    };

    this.desktopPlayPauseBtn?.addEventListener("click", togglePlay);
    this.desktopReturnBtn?.addEventListener("click", returnToArticle);
    this.desktopCloseBtn?.addEventListener("click", closePlayback);
  }

  public notifyPlay(audio: HTMLAudioElement, articleUrl: string, sourceId: string) {
    // If there's an existing background audio from ANOTHER source, stop it to guarantee singleton playback.
    if (this.activeAudio && this.currentSourceId !== sourceId) {
       // If it's a completely different audio being played, release the old one.
       this.stopAndRelease();
    }

    this.activeAudio = audio;
    this.currentArticleUrl = articleUrl;
    this.currentSourceId = sourceId;
  }

  public onBeforeSwap(oldUrl: string, newUrl: string) {
    if (!this.activeAudio || !this.currentArticleUrl || !this.currentSourceId) return;

    // Check if we are currently at the article containing the audio, and leaving it
    const oldUrlObj = new URL(oldUrl, location.origin);
    const sourceUrlObj = new URL(this.currentArticleUrl, location.origin);

    if (oldUrlObj.pathname === sourceUrlObj.pathname) {
      // Leaving the article
      const settings = getSettings();
      const isMobile = window.innerWidth <= 768;
      
      if (settings.disableBackgroundPlayback || isMobile) {
        this.stopAndRelease();
      } else if (!this.activeAudio.paused) {
        this.takeoverAudio();
      } else {
         // If it's paused when leaving, we just release it. We only takeover playing audio.
         this.stopAndRelease();
      }
    }
  }

  public onArticleContentSwapped() {
    // Check if we returned to the article URL
    if (this.isTakeoverActive && this.currentArticleUrl && this.currentSourceId) {
      const currentUrlObj = new URL(location.href);
      const sourceUrlObj = new URL(this.currentArticleUrl, location.origin);

      if (currentUrlObj.pathname === sourceUrlObj.pathname) {
        this.trySyncBack();
      }
    }
  }

  private takeoverAudio() {
    if (!this.activeAudio || !this.audioContainer) return;
    
    // Reparent audio to MediaManager
    this.audioContainer.appendChild(this.activeAudio);
    
    this.activeAudio.addEventListener("timeupdate", this.onTimeUpdateBound);
    this.activeAudio.addEventListener("play", this.onPlayBound);
    this.activeAudio.addEventListener("pause", this.onPauseBound);
    this.activeAudio.addEventListener("ended", this.onEndedBound);
    this.activeAudio.addEventListener("error", this.onErrorBound);

    this.isTakeoverActive = true;
    
    document.body.setAttribute("data-media-manager-active", "true");
    
    // Initial sync
    this.updateUI();
  }

  public claimAudio(sourceId: string): HTMLAudioElement | null {
    if (this.isTakeoverActive && this.activeAudio && this.currentSourceId === sourceId) {
      const audio = this.activeAudio;
      this.releaseTakeoverState();
      return audio;
    }
    return null;
  }

  private trySyncBack() {
    // If the new article player claims the audio, it will call `claimAudio`.
    // So we don't need to do anything proactively here unless we want to clean up if it WASN'T claimed.
    // But since the new player renders after DOM swap, and setupNeteasePlayers is called synchronously after,
    // claimAudio will be called immediately.
  }

  private stopAndRelease() {
    if (this.activeAudio) {
      this.activeAudio.pause();
    }
    this.releaseTakeoverState();
    this.activeAudio = null;
    this.currentArticleUrl = null;
    this.currentSourceId = null;
  }

  private releaseTakeoverState() {
    if (this.activeAudio) {
      this.activeAudio.removeEventListener("timeupdate", this.onTimeUpdateBound);
      this.activeAudio.removeEventListener("play", this.onPlayBound);
      this.activeAudio.removeEventListener("pause", this.onPauseBound);
      this.activeAudio.removeEventListener("ended", this.onEndedBound);
      this.activeAudio.removeEventListener("error", this.onErrorBound);
      
      if (this.activeAudio.parentElement === this.audioContainer) {
          this.activeAudio.remove(); // just remove from our hidden container
      }
    }
    this.isTakeoverActive = false;
    document.body.setAttribute("data-media-manager-active", "false");
  }

  private onSettingsChange(e: Event) {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && customEvent.detail.disableBackgroundPlayback) {
      if (this.isTakeoverActive) {
        this.stopAndRelease();
      }
    }
  }

  private onTimeUpdate() {
    this.updateProgressUI();
  }

  private onPlay() {
    this.updatePlayPauseUI(true);
  }

  private onPause() {
    this.updatePlayPauseUI(false);
  }

  private onEnded() {
    this.updatePlayPauseUI(false);
    this.updateProgressUI(true);
  }

  private onError() {
    this.stopAndRelease();
  }

  private updateUI() {
    if (!this.activeAudio) return;
    this.updatePlayPauseUI(!this.activeAudio.paused);
    this.updateProgressUI();
  }

  private updatePlayPauseUI(isPlaying: boolean) {
    const iconName = isPlaying ? "pause" : "play_arrow";
    
    if (this.desktopPlayPauseIcon) {
      this.desktopPlayPauseIcon.textContent = iconName;
    }

    const currentStatusIcon = isPlaying ? "play_arrow" : "pause";
    const actionIcon = isPlaying ? "pause" : "play_arrow";

    if (this.desktopPlayPauseBtn) {
      const current = this.desktopPlayPauseBtn.querySelector(".mm-icon-current");
      const hover = this.desktopPlayPauseBtn.querySelector(".mm-icon-hover");
      if (current) current.textContent = currentStatusIcon;
      if (hover) hover.textContent = actionIcon;
    }
  }

  private updateProgressUI(forceEnded: boolean = false) {
    if (!this.activeAudio || !this.container) return;

    let percentage = 0;
    if (this.activeAudio.duration) {
       percentage = (this.activeAudio.currentTime / this.activeAudio.duration) * 100;
    }
    
    if (forceEnded) {
       percentage = 100;
    }

    const rounded = Math.round(percentage);
    const text = isNaN(rounded) ? "--%" : `${rounded}%`;

    if (this.desktopProgressText) {
      this.desktopProgressText.textContent = text;
    }

    this.container.style.setProperty("--media-progress", `${percentage}%`);
  }
}

export const daybookMediaManager = MediaManager.getInstance();

document.addEventListener("daybook:before-swap", (e: Event) => {
  const ce = e as CustomEvent;
  daybookMediaManager.onBeforeSwap(ce.detail.oldUrl, ce.detail.newUrl);
});

document.addEventListener("daybook:article-content-swapped", () => {
  daybookMediaManager.onArticleContentSwapped();
});

// Also trigger on page-load in case of traversing back/forward
document.addEventListener("daybook:page-load", (e: Event) => {
  const ce = e as CustomEvent;
  // page-load event might happen on initial load, or traverse
  if (ce.detail.navigationType === "traverse") {
    daybookMediaManager.onArticleContentSwapped();
  }
});
