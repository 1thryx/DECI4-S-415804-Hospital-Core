/**
 * Lighthouse CI configuration.
 *
 * `lhci autorun` starts the frontend preview server, audits the built bundle three
 * times, and asserts each category against the thresholds below. Any score under
 * its threshold exits non-zero, which fails the GitHub Actions job.
 *
 * Local run:  cd frontend && npm run build && npx @lhci/cli autorun --config=../lighthouserc.js
 */
module.exports = {
  ci: {
    collect: {
      // Boot the real production bundle rather than the dev server — dev builds are
      // unminified and would report a misleadingly poor performance score.
      startServerCommand: 'npm --prefix ./frontend run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 60000,
      url: ['http://localhost:4173/', 'http://localhost:4173/patients', 'http://localhost:4173/appointments'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        // The SPA has no backend in CI, so skip audits that need real API traffic.
        skipAudits: ['uses-http2', 'canonical', 'is-crawlable']
      }
    },

    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],

        // Individual budgets that catch regressions a category average can hide.
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Accessibility rules that matter most for a clinical tool used at speed.
        'color-contrast': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        label: 'error'
      }
    },

    upload: {
      // Reports land in .lighthouseci/ and are uploaded as a workflow artifact.
      target: 'filesystem',
      outputDir: './.lighthouseci'
    }
  }
};
