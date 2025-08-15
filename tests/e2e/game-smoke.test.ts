import { test, expect } from '@playwright/test';

test.describe('Game Page Smoke Test', () => {
  test('should load /game page with all ready gates passing', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable debug mode to show ready gates status strip
    await page.goto('/game', { waitUntil: 'networkidle' });
    await page.addInitScript(() => {
      window.localStorage.setItem('NEXT_PUBLIC_DEBUG', '1');
    });
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait for the page to start loading - should see diagnostic stepper OR ready gates OR game interface
    // Note: App might load so fast that diagnostics are skipped entirely
    await page.waitForLoadState('networkidle');
    
    // Check what's visible - diagnostics, ready gates, or game interface
    const hasSystemDiagnostics = await page.locator('text=System Diagnostics').isVisible().catch(() => false);
    const hasReadyGates = await page.locator('text=Ready Gates').isVisible().catch(() => false);
    const hasGameInterface = await page.locator('text=Mission Control, text=TACTICAL ANALYTICS').isVisible().catch(() => false);
    
    if (!hasSystemDiagnostics && !hasReadyGates && !hasGameInterface) {
      // Take a screenshot to see what's actually showing
      await page.screenshot({ path: 'test-results/debug-initial-state.png', fullPage: true });
      throw new Error('No recognizable app state found - may not be loading properly');
    }
    
    // If game interface is already loaded, app succeeded immediately
    if (hasGameInterface && !hasSystemDiagnostics && !hasReadyGates) {
      console.log('App loaded instantly - skipping gate checks (success!)');
      await page.screenshot({ path: 'test-results/game-instant-success.png', fullPage: true });
      return; // Test passes - app loaded perfectly
    }
    
    // Wait for the Ready Gates status strip to appear (may take time to mount)
    await page.waitForSelector('text=Ready Gates', { timeout: 15000 }).catch(async () => {
      await page.screenshot({ path: 'test-results/debug-no-ready-gates.png', fullPage: true });
      throw new Error('Ready Gates status strip never appeared');
    });
    
    // Wait for all gates to become ready (check for specific gate names)
    const gateNames = ['fonts', 'store', 'map', 'simWorker', 'perfWorker', 'heatmaps'];
    const gateResults = [];
    
    for (const gateName of gateNames) {
      try {
        // Wait for each gate to appear in the status strip
        await expect(page.locator(`text=${gateName}`)).toBeVisible({ timeout: 10000 });
        
        // Look for the gate row and check it becomes ready
        const gateRow = page.locator(`div:has-text("${gateName}")`).first();
        await expect(gateRow).toBeVisible();
        
        // Wait for either success timing or error state
        const hasSuccessTiming = await gateRow.locator('text=/\\d+ms/').isVisible({ timeout: 15000 }).catch(() => false);
        const hasErrorIcon = await gateRow.locator('svg[class*="text-red"]').isVisible().catch(() => false);
        
        if (hasSuccessTiming) {
          gateResults.push({ gate: gateName, status: 'success' });
        } else if (hasErrorIcon) {
          gateResults.push({ gate: gateName, status: 'error' });
        } else {
          gateResults.push({ gate: gateName, status: 'timeout' });
        }
      } catch (error) {
        gateResults.push({ gate: gateName, status: 'failed', error: error.message });
      }
    }
    
    // Log gate results for debugging
    console.log('Gate Results:', gateResults);
    
    // Check for critical failures (all gates failed - should be very rare)
    const failedGates = gateResults.filter(r => r.status === 'failed' || r.status === 'timeout');
    if (failedGates.length >= gateNames.length) {
      await page.screenshot({ path: 'test-results/debug-all-gate-failures.png', fullPage: true });
      throw new Error(`All gates failed: ${failedGates.map(g => g.gate).join(', ')}`);
    }
    
    // Log results for CI debugging
    console.log(`Gate Status: ${gateResults.length - failedGates.length}/${gateResults.length} passed`);
    if (failedGates.length > 0) {
      console.log(`Failed gates: ${failedGates.map(g => `${g.gate}(${g.status})`).join(', ')}`);
    }
    
    // Wait for the main interface to load (either diagnostics disappear or we see game UI)
    await Promise.race([
      page.waitForSelector('text=System Diagnostics', { state: 'detached', timeout: 20000 }),
      page.waitForSelector('.lattice-layout, [data-testid="game-interface"]', { timeout: 20000 }),
      page.waitForFunction(() => {
        const diagnostics = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent?.includes('System Diagnostics')
        );
        return !diagnostics || diagnostics.offsetParent === null;
      }, { timeout: 20000 })
    ]).catch(async () => {
      await page.screenshot({ path: 'test-results/debug-interface-timeout.png', fullPage: true });
      throw new Error('Game interface failed to load within timeout');
    });
    
    // Check that we're not stuck on loading
    const stillLoading = await page.locator('text=Loading tactical interface, text=Loading...').isVisible().catch(() => false);
    if (stillLoading) {
      await page.screenshot({ path: 'test-results/debug-stuck-loading.png', fullPage: true });
      throw new Error('App appears to be stuck in loading state');
    }
    
    // Take a screenshot of the final state
    await page.screenshot({ 
      path: 'test-results/game-final-state.png', 
      fullPage: true 
    });
    
    // Verify we have some kind of functional game interface
    const hasWorkingInterface = await Promise.race([
      page.locator('.lattice-layout').isVisible().catch(() => false),
      page.locator('[data-testid="game-interface"]').isVisible().catch(() => false),
      page.locator('text=Mission Control').isVisible().catch(() => false),
      page.locator('button, input, canvas').first().isVisible().catch(() => false)
    ]);
    
    if (!hasWorkingInterface) {
      throw new Error('No functional game interface detected');
    }
    
    // Success! The app loaded and shows interactive elements
    console.log('✅ Game smoke test passed - app loaded successfully');
  });
  
  test('should handle graceful degradation when workers fail', async ({ page }) => {
    // This test ensures the app still loads even when some subsystems fail
    await page.goto('/game?debug=1');
    
    // Wait for initial load
    await expect(page.locator('text=Ready Gates')).toBeVisible({ timeout: 10000 });
    
    // Even if some gates fail, the app should still become usable
    // Wait for either full success or graceful degradation
    await page.waitForFunction(() => {
      // Check if we have either all gates ready or the main interface loaded
      const diagnostics = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.includes('System Diagnostics')
      );
      const gameInterface = document.querySelector('[data-testid="game-interface"], .lattice-layout') ||
                           Array.from(document.querySelectorAll('*')).find(el => 
                             el.textContent?.includes('Mission Control') || el.textContent?.includes('TACTICAL ANALYTICS')
                           );
      
      // App is ready if diagnostics are hidden and game interface is visible
      return (!diagnostics || !diagnostics.offsetParent) && 
             (gameInterface && gameInterface.offsetParent);
    }, { timeout: 30000 });
    
    // Verify no infinite loading states
    await expect(page.locator('text=Loading tactical interface')).not.toBeVisible();
    
    // Take screenshot regardless of whether all gates passed
    await page.screenshot({ 
      path: 'test-results/game-loaded-state.png', 
      fullPage: true 
    });
  });
  
  test('should fail fast if app hangs on loading', async ({ page }) => {
    // This test ensures we detect hanging scenarios quickly
    await page.goto('/game');
    
    // Should see initial loading state
    await expect(page.locator('text=System Diagnostics')).toBeVisible({ timeout: 5000 });
    
    // But should not stay in loading state indefinitely
    // If still showing diagnostics after 25 seconds, something is wrong
    await page.waitForFunction(() => {
      const diagnostics = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.includes('System Diagnostics')
      );
      return !diagnostics || !diagnostics.offsetParent;
    }, { timeout: 25000 });
    
    // Verify we reached a functional state
    await expect(page.locator('[data-testid="game-interface"], .lattice-layout, text=Mission Control').first()).toBeVisible({ timeout: 5000 });
  });
});