/**
 * Advanced Keyboard Navigation Patterns
 * 
 * This module provides advanced keyboard navigation patterns for complex widgets
 * including data grids, tree views, carousels, and custom clinic workflows.
 */

import { keyboardNavigation } from './keyboard-navigation';
import { focusManager } from './focus-management';
import { announce } from './aria-attributes';

export interface DataGridNavigation {
  container: HTMLElement;
  rows: HTMLElement[];
  cells: HTMLElement[][];
  currentRow: number;
  currentCell: number;
  selectionMode: 'single' | 'multiple' | 'none';
  selectedCells: Set<string>;
}

export interface TreeViewNavigation {
  container: HTMLElement;
  nodes: Map<string, TreeNode>;
  currentNode: string | null;
  expandedNodes: Set<string>;
}

export interface TreeNode {
  id: string;
  element: HTMLElement;
  parent: string | null;
  children: string[];
  level: number;
  expanded: boolean;
  selected: boolean;
}

export interface CarouselNavigation {
  container: HTMLElement;
  slides: HTMLElement[];
  currentSlide: number;
  autoPlay: boolean;
  announceSlides: boolean;
}

class AdvancedKeyboardNavigation {
  private dataGrids = new Map<string, DataGridNavigation>();
  private treeViews = new Map<string, TreeViewNavigation>();
  private carousels = new Map<string, CarouselNavigation>();
  private clinicShortcuts = new Map<string, () => void>();

  constructor() {
    this.setupClinicSpecificShortcuts();
    this.setupEventListeners();
  }

  /**
   * Setup clinic-specific keyboard shortcuts
   */
  private setupClinicSpecificShortcuts(): void {
    // Patient management shortcuts
    this.clinicShortcuts.set('ctrl+shift+p', () => {
      this.navigateToPatientSearch();
      announce('Navigated to patient search', 'polite');
    });

    this.clinicShortcuts.set('ctrl+shift+a', () => {
      this.navigateToAppointments();
      announce('Navigated to appointments', 'polite');
    });

    this.clinicShortcuts.set('ctrl+shift+r', () => {
      this.navigateToReports();
      announce('Navigated to reports', 'polite');
    });

    this.clinicShortcuts.set('ctrl+shift+s', () => {
      this.navigateToSettings();
      announce('Navigated to settings', 'polite');
    });

    // Quick actions
    this.clinicShortcuts.set('ctrl+shift+n', () => {
      this.createNewPatient();
      announce('Creating new patient', 'assertive');
    });

    this.clinicShortcuts.set('ctrl+shift+b', () => {
      this.bookAppointment();
      announce('Booking new appointment', 'assertive');
    });

    // Emergency shortcuts
    this.clinicShortcuts.set('ctrl+shift+e', () => {
      this.emergencyMode();
      announce('Emergency mode activated', 'assertive');
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      this.handleGlobalKeydown(event);
    });
  }

  /**
   * Handle global keydown events
   */
  private handleGlobalKeydown(event: KeyboardEvent): void {
    const shortcutKey = this.getShortcutKey(event);
    
    if (this.clinicShortcuts.has(shortcutKey)) {
      event.preventDefault();
      this.clinicShortcuts.get(shortcutKey)!();
      return;
    }

    // Handle data grid navigation
    this.handleDataGridNavigation(event);
    
    // Handle tree view navigation
    this.handleTreeViewNavigation(event);
    
    // Handle carousel navigation
    this.handleCarouselNavigation(event);
  }

  /**
   * Create data grid navigation
   */
  createDataGrid(
    containerId: string,
    container: HTMLElement,
    options: {
      selectionMode?: 'single' | 'multiple' | 'none';
      announceChanges?: boolean;
    } = {}
  ): void {
    const { selectionMode = 'single', announceChanges = true } = options;

    const rows = Array.from(container.querySelectorAll('[role="row"]')) as HTMLElement[];
    const cells: HTMLElement[][] = [];

    rows.forEach(row => {
      const rowCells = Array.from(row.querySelectorAll('[role="gridcell"], [role="columnheader"], [role="rowheader"]')) as HTMLElement[];
      cells.push(rowCells);
    });

    const dataGrid: DataGridNavigation = {
      container,
      rows,
      cells,
      currentRow: 0,
      currentCell: 0,
      selectionMode,
      selectedCells: new Set(),
    };

    // Setup ARIA attributes
    container.setAttribute('role', 'grid');
    container.setAttribute('aria-multiselectable', selectionMode === 'multiple' ? 'true' : 'false');
    
    // Setup initial focus
    if (cells.length > 0 && cells[0].length > 0) {
      this.focusGridCell(dataGrid, 0, 0);
    }

    this.dataGrids.set(containerId, dataGrid);

    if (announceChanges) {
      announce(`Data grid with ${rows.length} rows and ${cells[0]?.length || 0} columns loaded`, 'polite');
    }
  }

  /**
   * Handle data grid navigation
   */
  private handleDataGridNavigation(event: KeyboardEvent): void {
    const activeGrid = this.getActiveDataGrid();
    if (!activeGrid) return;

    const { key, ctrlKey, shiftKey } = event;
    let handled = false;

    switch (key) {
      case 'ArrowUp':
        this.moveGridFocus(activeGrid, -1, 0);
        handled = true;
        break;
      case 'ArrowDown':
        this.moveGridFocus(activeGrid, 1, 0);
        handled = true;
        break;
      case 'ArrowLeft':
        this.moveGridFocus(activeGrid, 0, -1);
        handled = true;
        break;
      case 'ArrowRight':
        this.moveGridFocus(activeGrid, 0, 1);
        handled = true;
        break;
      case 'Home':
        if (ctrlKey) {
          this.focusGridCell(activeGrid, 0, 0);
        } else {
          this.focusGridCell(activeGrid, activeGrid.currentRow, 0);
        }
        handled = true;
        break;
      case 'End':
        if (ctrlKey) {
          this.focusGridCell(activeGrid, activeGrid.rows.length - 1, activeGrid.cells[activeGrid.rows.length - 1]?.length - 1 || 0);
        } else {
          this.focusGridCell(activeGrid, activeGrid.currentRow, activeGrid.cells[activeGrid.currentRow]?.length - 1 || 0);
        }
        handled = true;
        break;
      case 'PageUp':
        this.moveGridFocus(activeGrid, -10, 0);
        handled = true;
        break;
      case 'PageDown':
        this.moveGridFocus(activeGrid, 10, 0);
        handled = true;
        break;
      case ' ':
      case 'Enter':
        this.selectGridCell(activeGrid, shiftKey);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Navigation helper methods (to be implemented)
   */
  private navigateToPatientSearch(): void {
    const searchElement = document.querySelector('[data-testid="patient-search"]') as HTMLElement;
    if (searchElement) {
      focusManager.focusElement(searchElement, 'programmatic', 'keyboard-shortcut');
    }
  }

  private navigateToAppointments(): void {
    const appointmentsElement = document.querySelector('[data-testid="appointments"]') as HTMLElement;
    if (appointmentsElement) {
      focusManager.focusElement(appointmentsElement, 'programmatic', 'keyboard-shortcut');
    }
  }

  private navigateToReports(): void {
    const reportsElement = document.querySelector('[data-testid="reports"]') as HTMLElement;
    if (reportsElement) {
      focusManager.focusElement(reportsElement, 'programmatic', 'keyboard-shortcut');
    }
  }

  private navigateToSettings(): void {
    const settingsElement = document.querySelector('[data-testid="settings"]') as HTMLElement;
    if (settingsElement) {
      focusManager.focusElement(settingsElement, 'programmatic', 'keyboard-shortcut');
    }
  }

  private createNewPatient(): void {
    const newPatientButton = document.querySelector('[data-testid="new-patient-button"]') as HTMLElement;
    if (newPatientButton) {
      newPatientButton.click();
    }
  }

  private bookAppointment(): void {
    const bookButton = document.querySelector('[data-testid="book-appointment-button"]') as HTMLElement;
    if (bookButton) {
      bookButton.click();
    }
  }

  private emergencyMode(): void {
    const emergencyButton = document.querySelector('[data-testid="emergency-mode-button"]') as HTMLElement;
    if (emergencyButton) {
      emergencyButton.click();
    }
  }

  /**
   * Get currently active data grid
   */
  private getActiveDataGrid(): DataGridNavigation | null {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return null;

    for (const [id, grid] of this.dataGrids) {
      if (grid.container.contains(activeElement)) {
        return grid;
      }
    }
    return null;
  }

  /**
   * Move focus within data grid
   */
  private moveGridFocus(grid: DataGridNavigation, rowDelta: number, cellDelta: number): void {
    const newRow = Math.max(0, Math.min(grid.rows.length - 1, grid.currentRow + rowDelta));
    const newCell = Math.max(0, Math.min(grid.cells[newRow]?.length - 1 || 0, grid.currentCell + cellDelta));

    this.focusGridCell(grid, newRow, newCell);
  }

  /**
   * Focus specific grid cell
   */
  private focusGridCell(grid: DataGridNavigation, row: number, cell: number): void {
    if (row < 0 || row >= grid.rows.length) return;
    if (cell < 0 || cell >= (grid.cells[row]?.length || 0)) return;

    const targetCell = grid.cells[row][cell];
    if (!targetCell) return;

    // Update current position
    grid.currentRow = row;
    grid.currentCell = cell;

    // Update tabindex
    grid.cells.forEach((rowCells, rowIndex) => {
      rowCells.forEach((cellElement, cellIndex) => {
        cellElement.setAttribute('tabindex', (rowIndex === row && cellIndex === cell) ? '0' : '-1');
      });
    });

    // Focus the cell
    focusManager.focusElement(targetCell, 'programmatic', 'grid-navigation');

    // Announce position
    const rowLabel = grid.rows[row].getAttribute('aria-label') || `Row ${row + 1}`;
    const cellLabel = targetCell.getAttribute('aria-label') || targetCell.textContent || `Column ${cell + 1}`;
    announce(`${rowLabel}, ${cellLabel}`, 'polite');
  }

  /**
   * Select grid cell
   */
  private selectGridCell(grid: DataGridNavigation, multiSelect: boolean): void {
    if (grid.selectionMode === 'none') return;

    const cellId = `${grid.currentRow}-${grid.currentCell}`;
    const currentCell = grid.cells[grid.currentRow][grid.currentCell];

    if (grid.selectionMode === 'single') {
      // Clear previous selections
      grid.selectedCells.clear();
      grid.cells.forEach(rowCells => {
        rowCells.forEach(cell => {
          cell.setAttribute('aria-selected', 'false');
          cell.classList.remove('selected');
        });
      });
    }

    if (grid.selectedCells.has(cellId)) {
      // Deselect
      grid.selectedCells.delete(cellId);
      currentCell.setAttribute('aria-selected', 'false');
      currentCell.classList.remove('selected');
      announce('Cell deselected', 'polite');
    } else {
      // Select
      grid.selectedCells.add(cellId);
      currentCell.setAttribute('aria-selected', 'true');
      currentCell.classList.add('selected');
      announce('Cell selected', 'polite');
    }
  }

  /**
   * Create tree view navigation
   */
  createTreeView(
    containerId: string,
    container: HTMLElement,
    options: {
      announceChanges?: boolean;
      multiSelect?: boolean;
    } = {}
  ): void {
    const { announceChanges = true, multiSelect = false } = options;

    const treeView: TreeViewNavigation = {
      container,
      nodes: new Map(),
      currentNode: null,
      expandedNodes: new Set(),
    };

    // Setup ARIA attributes
    container.setAttribute('role', 'tree');
    container.setAttribute('aria-multiselectable', multiSelect ? 'true' : 'false');

    // Initialize tree nodes
    this.initializeTreeNodes(treeView);

    this.treeViews.set(containerId, treeView);

    if (announceChanges) {
      announce(`Tree view with ${treeView.nodes.size} nodes loaded`, 'polite');
    }
  }

  /**
   * Initialize tree nodes
   */
  private initializeTreeNodes(treeView: TreeViewNavigation): void {
    const treeItems = Array.from(treeView.container.querySelectorAll('[role="treeitem"]')) as HTMLElement[];

    treeItems.forEach((item, index) => {
      const id = item.id || `tree-node-${index}`;
      const level = parseInt(item.getAttribute('aria-level') || '1');
      const expanded = item.getAttribute('aria-expanded') === 'true';

      const node: TreeNode = {
        id,
        element: item,
        parent: null,
        children: [],
        level,
        expanded,
        selected: false,
      };

      // Set up parent-child relationships
      const parentElement = item.parentElement?.closest('[role="treeitem"]') as HTMLElement;
      if (parentElement) {
        node.parent = parentElement.id;
        const parentNode = treeView.nodes.get(parentElement.id);
        if (parentNode) {
          parentNode.children.push(id);
        }
      }

      treeView.nodes.set(id, node);

      if (expanded) {
        treeView.expandedNodes.add(id);
      }

      // Set initial tabindex
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    // Set initial current node
    if (treeItems.length > 0) {
      treeView.currentNode = treeItems[0].id;
    }
  }

  /**
   * Handle tree view navigation
   */
  private handleTreeViewNavigation(event: KeyboardEvent): void {
    const activeTree = this.getActiveTreeView();
    if (!activeTree) return;

    const { key, ctrlKey, shiftKey } = event;
    let handled = false;

    switch (key) {
      case 'ArrowUp':
        this.moveToPreviousNode(activeTree);
        handled = true;
        break;
      case 'ArrowDown':
        this.moveToNextNode(activeTree);
        handled = true;
        break;
      case 'ArrowLeft':
        this.collapseOrMoveToParent(activeTree);
        handled = true;
        break;
      case 'ArrowRight':
        this.expandOrMoveToChild(activeTree);
        handled = true;
        break;
      case 'Home':
        this.moveToFirstNode(activeTree);
        handled = true;
        break;
      case 'End':
        this.moveToLastNode(activeTree);
        handled = true;
        break;
      case ' ':
      case 'Enter':
        this.selectTreeNode(activeTree, shiftKey);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Get currently active tree view
   */
  private getActiveTreeView(): TreeViewNavigation | null {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return null;

    for (const [id, tree] of this.treeViews) {
      if (tree.container.contains(activeElement)) {
        return tree;
      }
    }
    return null;
  }

  /**
   * Tree navigation methods
   */
  private moveToPreviousNode(tree: TreeViewNavigation): void {
    if (!tree.currentNode) return;

    const visibleNodes = this.getVisibleTreeNodes(tree);
    const currentIndex = visibleNodes.findIndex(node => node.id === tree.currentNode);

    if (currentIndex > 0) {
      this.focusTreeNode(tree, visibleNodes[currentIndex - 1].id);
    }
  }

  private moveToNextNode(tree: TreeViewNavigation): void {
    if (!tree.currentNode) return;

    const visibleNodes = this.getVisibleTreeNodes(tree);
    const currentIndex = visibleNodes.findIndex(node => node.id === tree.currentNode);

    if (currentIndex < visibleNodes.length - 1) {
      this.focusTreeNode(tree, visibleNodes[currentIndex + 1].id);
    }
  }

  private collapseOrMoveToParent(tree: TreeViewNavigation): void {
    if (!tree.currentNode) return;

    const currentNode = tree.nodes.get(tree.currentNode);
    if (!currentNode) return;

    if (currentNode.expanded && currentNode.children.length > 0) {
      // Collapse current node
      this.toggleTreeNode(tree, tree.currentNode, false);
    } else if (currentNode.parent) {
      // Move to parent
      this.focusTreeNode(tree, currentNode.parent);
    }
  }

  private expandOrMoveToChild(tree: TreeViewNavigation): void {
    if (!tree.currentNode) return;

    const currentNode = tree.nodes.get(tree.currentNode);
    if (!currentNode) return;

    if (currentNode.children.length > 0) {
      if (!currentNode.expanded) {
        // Expand current node
        this.toggleTreeNode(tree, tree.currentNode, true);
      } else {
        // Move to first child
        this.focusTreeNode(tree, currentNode.children[0]);
      }
    }
  }

  private moveToFirstNode(tree: TreeViewNavigation): void {
    const visibleNodes = this.getVisibleTreeNodes(tree);
    if (visibleNodes.length > 0) {
      this.focusTreeNode(tree, visibleNodes[0].id);
    }
  }

  private moveToLastNode(tree: TreeViewNavigation): void {
    const visibleNodes = this.getVisibleTreeNodes(tree);
    if (visibleNodes.length > 0) {
      this.focusTreeNode(tree, visibleNodes[visibleNodes.length - 1].id);
    }
  }

  private selectTreeNode(tree: TreeViewNavigation, multiSelect: boolean): void {
    if (!tree.currentNode) return;

    const currentNode = tree.nodes.get(tree.currentNode);
    if (!currentNode) return;

    currentNode.selected = !currentNode.selected;
    currentNode.element.setAttribute('aria-selected', currentNode.selected.toString());

    if (currentNode.selected) {
      currentNode.element.classList.add('selected');
      announce(`${currentNode.element.textContent} selected`, 'polite');
    } else {
      currentNode.element.classList.remove('selected');
      announce(`${currentNode.element.textContent} deselected`, 'polite');
    }
  }

  private focusTreeNode(tree: TreeViewNavigation, nodeId: string): void {
    const node = tree.nodes.get(nodeId);
    if (!node) return;

    // Update tabindex
    tree.nodes.forEach((n) => {
      n.element.setAttribute('tabindex', n.id === nodeId ? '0' : '-1');
    });

    tree.currentNode = nodeId;
    focusManager.focusElement(node.element, 'programmatic', 'tree-navigation');

    // Announce node
    const level = node.level;
    const expanded = node.expanded ? 'expanded' : 'collapsed';
    const hasChildren = node.children.length > 0 ? `${expanded}, ${node.children.length} children` : 'leaf';
    announce(`${node.element.textContent}, level ${level}, ${hasChildren}`, 'polite');
  }

  private toggleTreeNode(tree: TreeViewNavigation, nodeId: string, expand: boolean): void {
    const node = tree.nodes.get(nodeId);
    if (!node) return;

    node.expanded = expand;
    node.element.setAttribute('aria-expanded', expand.toString());

    if (expand) {
      tree.expandedNodes.add(nodeId);
      announce(`${node.element.textContent} expanded`, 'polite');
    } else {
      tree.expandedNodes.delete(nodeId);
      announce(`${node.element.textContent} collapsed`, 'polite');
    }

    // Show/hide children
    this.updateTreeVisibility(tree);
  }

  private getVisibleTreeNodes(tree: TreeViewNavigation): TreeNode[] {
    const visibleNodes: TreeNode[] = [];

    const addVisibleNodes = (nodeId: string) => {
      const node = tree.nodes.get(nodeId);
      if (!node) return;

      visibleNodes.push(node);

      if (node.expanded) {
        node.children.forEach(childId => addVisibleNodes(childId));
      }
    };

    // Start with root nodes
    tree.nodes.forEach(node => {
      if (!node.parent) {
        addVisibleNodes(node.id);
      }
    });

    return visibleNodes;
  }

  private updateTreeVisibility(tree: TreeViewNavigation): void {
    const visibleNodes = this.getVisibleTreeNodes(tree);
    const visibleIds = new Set(visibleNodes.map(node => node.id));

    tree.nodes.forEach(node => {
      if (visibleIds.has(node.id)) {
        node.element.style.display = '';
      } else {
        node.element.style.display = 'none';
      }
    });
  }

  /**
   * Create carousel navigation
   */
  createCarousel(
    containerId: string,
    container: HTMLElement,
    options: {
      autoPlay?: boolean;
      announceSlides?: boolean;
      autoPlayInterval?: number;
    } = {}
  ): void {
    const { autoPlay = false, announceSlides = true, autoPlayInterval = 5000 } = options;

    const slides = Array.from(container.querySelectorAll('[role="tabpanel"], .slide')) as HTMLElement[];

    const carousel: CarouselNavigation = {
      container,
      slides,
      currentSlide: 0,
      autoPlay,
      announceSlides,
    };

    // Setup ARIA attributes
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Carousel');

    slides.forEach((slide, index) => {
      slide.setAttribute('role', 'tabpanel');
      slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
      slide.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });

    this.carousels.set(containerId, carousel);

    if (announceSlides) {
      announce(`Carousel with ${slides.length} slides loaded. Currently showing slide 1 of ${slides.length}`, 'polite');
    }

    // Setup auto-play if enabled
    if (autoPlay) {
      this.setupCarouselAutoPlay(carousel, autoPlayInterval);
    }
  }

  /**
   * Handle carousel navigation
   */
  private handleCarouselNavigation(event: KeyboardEvent): void {
    const activeCarousel = this.getActiveCarousel();
    if (!activeCarousel) return;

    const { key } = event;
    let handled = false;

    switch (key) {
      case 'ArrowLeft':
        this.previousSlide(activeCarousel);
        handled = true;
        break;
      case 'ArrowRight':
        this.nextSlide(activeCarousel);
        handled = true;
        break;
      case 'Home':
        this.goToSlide(activeCarousel, 0);
        handled = true;
        break;
      case 'End':
        this.goToSlide(activeCarousel, activeCarousel.slides.length - 1);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Get currently active carousel
   */
  private getActiveCarousel(): CarouselNavigation | null {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return null;

    for (const [id, carousel] of this.carousels) {
      if (carousel.container.contains(activeElement)) {
        return carousel;
      }
    }
    return null;
  }

  /**
   * Carousel navigation methods
   */
  private nextSlide(carousel: CarouselNavigation): void {
    const nextIndex = (carousel.currentSlide + 1) % carousel.slides.length;
    this.goToSlide(carousel, nextIndex);
  }

  private previousSlide(carousel: CarouselNavigation): void {
    const prevIndex = carousel.currentSlide === 0
      ? carousel.slides.length - 1
      : carousel.currentSlide - 1;
    this.goToSlide(carousel, prevIndex);
  }

  private goToSlide(carousel: CarouselNavigation, slideIndex: number): void {
    if (slideIndex < 0 || slideIndex >= carousel.slides.length) return;

    // Hide current slide
    const currentSlide = carousel.slides[carousel.currentSlide];
    currentSlide.setAttribute('aria-hidden', 'true');
    currentSlide.setAttribute('tabindex', '-1');

    // Show new slide
    const newSlide = carousel.slides[slideIndex];
    newSlide.setAttribute('aria-hidden', 'false');
    newSlide.setAttribute('tabindex', '0');

    carousel.currentSlide = slideIndex;
    focusManager.focusElement(newSlide, 'programmatic', 'carousel-navigation');

    if (carousel.announceSlides) {
      announce(`Slide ${slideIndex + 1} of ${carousel.slides.length}`, 'polite');
    }
  }

  private setupCarouselAutoPlay(carousel: CarouselNavigation, interval: number): void {
    setInterval(() => {
      if (carousel.autoPlay && !carousel.container.matches(':hover')) {
        this.nextSlide(carousel);
      }
    }, interval);
  }

  /**
   * Public API methods
   */

  /**
   * Get all registered data grids
   */
  getDataGrids(): Map<string, DataGridNavigation> {
    return new Map(this.dataGrids);
  }

  /**
   * Get all registered tree views
   */
  getTreeViews(): Map<string, TreeViewNavigation> {
    return new Map(this.treeViews);
  }

  /**
   * Get all registered carousels
   */
  getCarousels(): Map<string, CarouselNavigation> {
    return new Map(this.carousels);
  }

  /**
   * Remove data grid
   */
  removeDataGrid(id: string): void {
    this.dataGrids.delete(id);
  }

  /**
   * Remove tree view
   */
  removeTreeView(id: string): void {
    this.treeViews.delete(id);
  }

  /**
   * Remove carousel
   */
  removeCarousel(id: string): void {
    this.carousels.delete(id);
  }

  /**
   * Add custom clinic shortcut
   */
  addClinicShortcut(key: string, action: () => void, description?: string): void {
    this.clinicShortcuts.set(key, action);
  }

  /**
   * Remove clinic shortcut
   */
  removeClinicShortcut(key: string): void {
    this.clinicShortcuts.delete(key);
  }

  /**
   * Get all clinic shortcuts
   */
  getClinicShortcuts(): Map<string, () => void> {
    return new Map(this.clinicShortcuts);
  }

  /**
   * Cleanup all navigation instances
   */
  cleanup(): void {
    this.dataGrids.clear();
    this.treeViews.clear();
    this.carousels.clear();
    this.clinicShortcuts.clear();
  }
}
}

// Export singleton instance
export const advancedKeyboardNavigation = new AdvancedKeyboardNavigation();
