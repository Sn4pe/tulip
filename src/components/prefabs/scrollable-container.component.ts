import {
  ContainerComponent,
  ContainerMutable,
  DisplayObject,
  DisplayObjectMutable,
  PartialContainerProps,
  ScrollableMutable,
  ScrollableProps,
} from "../../types";
import { container, graphics } from "../core";
import {
  Cursor,
  DisplayObjectEvent,
  Event,
  EventMode,
  GraphicType,
} from "../../enums";
import { global } from "../../global";

export const scrollableContainer: ContainerComponent<
  ScrollableProps,
  ScrollableMutable
> = ({
  size,
  verticalScroll,
  horizontalScroll,
  jump,
  draggableContent,
  components = [],
  ...$props
}) => {
  const $container = container<PartialContainerProps, ScrollableMutable>({
    ...$props,
    sortableChildren: true,
    eventMode: EventMode.STATIC,
  });

  const $belowDisplay = graphics({
    type: GraphicType.RECTANGLE,
    width: size.width,
    height: size.height,
    alpha: 0,
    zIndex: Number.MIN_SAFE_INTEGER,
    eventMode: EventMode.STATIC,
  });
  $container.add($belowDisplay);

  const $maskContainer = container({
    zIndex: 10,
  });
  $container.add($maskContainer);

  const mask = graphics({
    type: GraphicType.RECTANGLE,
    width: size.width,
    height: size.height,
  });
  $maskContainer.setMask(mask);

  const $content = container({
    eventMode: EventMode.STATIC,
  });
  $maskContainer.add($content);

  let moveScrollX: (increment: number) => void | null;
  let moveScrollY: (increment: number) => void | null;

  let actionCallback: (delta: number) => void;

  let xScrollSelector: ContainerMutable;
  let yScrollSelector: ContainerMutable;

  let isXScrollable = false;
  let isYScrollable = false;

  const renderScroll = (axis: "x" | "y") => {
    const isX = axis === "x";
    const pivotFuncStr = isX ? "setPivotX" : "setPivotY";
    const positionFuncStr = isX ? "setPositionX" : "setPositionY";
    const sizeStr = isX ? "width" : "height";
    const reversedSizeStr = !isX ? "width" : "height";
    const posStr = isX ? "x" : "y";

    const setInternalSelectorAction = (
      displayObject: DisplayObjectMutable<DisplayObject>,
      jump: number,
      moveScroll: (num: number) => void,
    ) => {
      if (!isScrollable()) return;
      actionCallback = (delta) => {
        if (!displayObject.isCursorInside()) return (actionCallback = null);
        moveScroll(jump * delta * 2);
      };
    };
    const scrollContainer = container({
      position: {
        x: isX ? 0 : size.width,
        y: isX ? size.height : 0,
      },
    });
    $container.add(scrollContainer);

    const isScrollable = () => (isX ? isXScrollable : isYScrollable);

    const initialScrollButton = container({
      eventMode: EventMode.STATIC,
      cursor: Cursor.POINTER,
    });
    initialScrollButton.add(
      components.find(
        (component) =>
          component.getMetadata() === `scroll-button-${isX ? "left" : "top"}`,
      ) ??
        graphics({
          type: GraphicType.RECTANGLE,
          width: 10,
          height: 10,
          tint: 0xffff00,
        }),
    );
    const finalScrollButton = container({
      eventMode: EventMode.STATIC,
      cursor: Cursor.POINTER,
      position: {
        x: isX ? size.width : 0,
        y: isX ? 0 : size.height,
      },
    });
    finalScrollButton.add(
      components.find(
        (component) =>
          component.getMetadata() ===
          `scroll-button-${isX ? "right" : "bottom"}`,
      ) ??
        graphics({
          type: GraphicType.RECTANGLE,
          width: 10,
          height: 10,
          tint: 0xffff00,
        }),
    );
    const initialScrollButtonBounds = initialScrollButton.getBounds();
    const finalScrollButtonBounds = finalScrollButton.getBounds();
    finalScrollButton.setPosition({
      x: isX ? size.width - finalScrollButtonBounds.width : 0,
      y: isX ? 0 : size.height - finalScrollButtonBounds.height,
    });
    const scrollSelector = container({
      eventMode: EventMode.STATIC,
      cursor: Cursor.GRAB,
      position: {
        x: isX ? initialScrollButtonBounds.width : 0,
        y: isX ? 0 : initialScrollButtonBounds.height,
      },
    });

    isX
      ? (xScrollSelector = scrollSelector)
      : (yScrollSelector = scrollSelector);

    scrollSelector.add(
      components.find(
        (component) =>
          component.getMetadata() === `scroll-selector-${isX ? "x" : "y"}`,
      ) ??
        graphics({
          type: GraphicType.RECTANGLE,
          width: 10,
          height: 10,
          tint: 0x00ff00,
        }),
    );

    let isDragging = false;
    let draggingSource = null; // Tracks the origin of the drag ("scrollSelector" or "content")
    let previous = 0;

    function scrollPointerDown(source) {
      if (!isScrollable()) return;
      isDragging = true;
      draggingSource = source;
      previous = global.cursor.getPosition()[isX ? "x" : "y"];
      global.cursor.setCursor(Cursor.GRABBING);
    }

    function scrollPointerUp(source) {
      if (!isScrollable() || draggingSource !== source) return;
      isDragging = false;
      draggingSource = null;
      global.cursor.setCursor(Cursor.DEFAULT);
    }

    function scrollPointerUpOutside(source) {
      if (!isScrollable() || draggingSource !== source) return;
      isDragging = false;
      draggingSource = null;
      global.cursor.setCursor(Cursor.DEFAULT);
    }

    function scrollGlobalPointerMove(source) {
      if (!isDragging || draggingSource !== source) return;
      global.cursor.setCursor(Cursor.GRABBING);
      const current = global.cursor.getPosition()[isX ? "x" : "y"];
      const delta = previous - current;
      previous = current;

      if (source === "content") {
        moveFromDraggingContent(delta);
      } else if (source === "scrollSelector") {
        moveFromScrollSelector(delta);
      }
    }

    const dragComponents = [
      { target: scrollSelector, name: "scrollSelector" },
      ...(draggableContent ? [{ target: $content, name: "content" }] : []),
    ];

    dragComponents.forEach(({ target, name }) => {
      target.on(DisplayObjectEvent.POINTER_DOWN, () => scrollPointerDown(name));
      target.on(DisplayObjectEvent.POINTER_UP, () => scrollPointerUp(name));
      target.on(DisplayObjectEvent.POINTER_UP_OUTSIDE, () =>
        scrollPointerUpOutside(name),
      );
      target.on(DisplayObjectEvent.GLOBAL_POINTER_MOVE, () =>
        scrollGlobalPointerMove(name),
      );
    });

    const calculateScrollBounds = () => {
      const maxSize = Math.max(
        initialScrollButton.getBounds()[reversedSizeStr],
        scrollSelector.getBounds()[reversedSizeStr],
        finalScrollButton.getBounds()[reversedSizeStr],
      );

      const middleScrollSelectorPosition =
        initialScrollButton.getBounds()[sizeStr] -
        scrollSelector.getPivot()[posStr] +
        scrollSelector.getBounds()[reversedSizeStr];

      initialScrollSelector.setRectangle(
        isX
          ? middleScrollSelectorPosition -
              scrollSelector.getBounds()[reversedSizeStr]
          : maxSize,
        isX
          ? maxSize
          : middleScrollSelectorPosition -
              scrollSelector.getBounds()[reversedSizeStr],
      );
      finalScrollSelector[positionFuncStr](middleScrollSelectorPosition);
      finalScrollSelector.setRectangle(
        isX ? size[sizeStr] - middleScrollSelectorPosition : maxSize,
        isX ? maxSize : size[sizeStr] - middleScrollSelectorPosition,
      );
    };

    const moveFromScrollSelector = (increment: number = 1) => {
      if (!isScrollable()) return;
      const scrollAreaSize =
        size[sizeStr] -
        initialScrollButton.getBounds()[sizeStr] -
        finalScrollButton.getBounds()[sizeStr];
      const selectorValue = scrollSelector.getBounds()[sizeStr];

      scrollSelector[pivotFuncStr]((value) => {
        if (increment === 0) return value;
        const targetValue = value + increment;

        if (targetValue >= 0) return 0;
        if (-targetValue >= scrollAreaSize - selectorValue)
          return -scrollAreaSize + selectorValue;

        return targetValue;
      });

      // Calculate percentage of selector's position to adjust scrolling
      const percentage =
        scrollSelector.getPivot()[posStr] / (scrollAreaSize - selectorValue);

      // Move $content based on the position of the scroll selector
      const contentHeight = $content.getBounds()[sizeStr] - size[sizeStr];
      $content[pivotFuncStr](-contentHeight * percentage);

      calculateScrollBounds();
    };

    function moveFromDraggingContent(delta: number) {
      const contentHeight = $content.getBounds()[sizeStr] - size[sizeStr];
      const scrollAreaSize =
        size[sizeStr] -
        initialScrollButton.getBounds()[sizeStr] -
        finalScrollButton.getBounds()[sizeStr];
      const selectorValue = scrollSelector.getBounds()[sizeStr];

      const maxContentOffset = contentHeight;
      const currentOffset = $content.getPivot()[posStr];
      const newOffset = Math.max(
        0,
        Math.min(maxContentOffset, currentOffset + delta),
      );

      $content[pivotFuncStr](newOffset);

      const percentage = -newOffset / contentHeight;
      const newSelectorOffset = percentage * (scrollAreaSize - selectorValue);
      scrollSelector[pivotFuncStr](newSelectorOffset);
    }

    const initialScrollSelector = graphics({
      type: GraphicType.RECTANGLE,
      width: 0,
      height: 0,
      eventMode: EventMode.STATIC,
      cursor: Cursor.POINTER,
      tint: 0xff00ff,
      alpha: 0,
    });
    initialScrollSelector.on(DisplayObjectEvent.POINTER_DOWN, () => {
      setInternalSelectorAction(initialScrollSelector, -jump, moveScroll);
    });
    const finalScrollSelector = graphics({
      type: GraphicType.RECTANGLE,
      width: 0,
      height: 0,
      eventMode: EventMode.STATIC,
      cursor: Cursor.POINTER,
      tint: 0xff0000,
      alpha: 0,
    });
    finalScrollSelector.on(DisplayObjectEvent.POINTER_DOWN, () => {
      setInternalSelectorAction(finalScrollSelector, jump, moveScroll);
    });

    const moveScrollFunction = (increment: number = 1) => {
      if (!scrollContainer.getVisible() || !scrollSelector?.getVisible())
        return;

      const $size = $content.getBounds()[sizeStr] - size[sizeStr];
      $content[pivotFuncStr]((value) => {
        if (increment === 0) return value;
        const targetValue = value + increment;
        if (targetValue >= $size) return $size;
        if (0 >= targetValue) return 0;
        return targetValue;
      });

      const percentage = $content.getPivot()[posStr] / $size;
      scrollSelector[pivotFuncStr](
        -(
          size[sizeStr] -
          initialScrollButton.getBounds()[sizeStr] -
          scrollSelector.getBounds()[sizeStr] -
          finalScrollButton.getBounds()[sizeStr]
        ) * percentage,
      );
      calculateScrollBounds();
    };
    isX
      ? (moveScrollX = moveScrollFunction)
      : (moveScrollY = moveScrollFunction);

    const moveScroll = isX ? moveScrollX : moveScrollY;

    moveScroll(0);
    initialScrollButton.on(DisplayObjectEvent.POINTER_DOWN, () => {
      if (!isScrollable()) return;
      actionCallback = (delta) => moveScroll(-jump * delta);
    });
    finalScrollButton.on(DisplayObjectEvent.POINTER_DOWN, () => {
      if (!isScrollable()) return;
      actionCallback = (delta) => moveScroll(jump * delta);
    });

    scrollContainer.add(
      initialScrollSelector,
      finalScrollSelector,
      initialScrollButton,
      scrollSelector,
      finalScrollButton,
    );
  };

  verticalScroll && renderScroll("y");
  horizontalScroll && renderScroll("x");

  const add = (...displayObjects: DisplayObjectMutable<DisplayObject>[]) => {
    const children = $content.getChildren();
    const childrenLength = children.length;
    if (childrenLength > 0) {
      const bg = children[childrenLength - 1];
      $content.remove(bg);
    }

    const contentBounds = $content.getBounds();

    const newBg = graphics({
      type: GraphicType.RECTANGLE,
      width: $container.getBounds().width,
      height: contentBounds.height,
      tint: 0x000000,
      zIndex: -1,
      alpha: 0,
    });

    $content.add(...displayObjects, newBg);

    isXScrollable = contentBounds.width > size.width;
    isYScrollable = contentBounds.height > size.height;

    xScrollSelector?.setVisible(isXScrollable);
    yScrollSelector?.setVisible(isYScrollable);
  };
  const remove = (...displayObjects: DisplayObjectMutable<DisplayObject>[]) => {
    $content.remove(...displayObjects);
  };

  let removeOnWheel;
  let removeOnPointerUp;
  let removeOnTick;

  $container.on(DisplayObjectEvent.ADDED, () => {
    removeOnWheel = global.events.on(Event.WHEEL, (event: WheelEvent) => {
      if (!$container.isHoverInside()) return;

      const deltaX = (event.shiftKey ? event.deltaY : event.deltaX) / jump;
      const deltaY = (event.shiftKey ? 0 : event.deltaY) / jump;

      moveScrollX?.(deltaX);
      moveScrollY?.(deltaY);
    });
    removeOnPointerUp = global.events.on(Event.POINTER_UP, () => {
      actionCallback = null;
    });
    removeOnTick = global.events.on(Event.TICK, ({ deltaTime }) => {
      actionCallback?.(deltaTime);
    });
  });

  $container.on(DisplayObjectEvent.REMOVED, () => {
    removeOnTick();
    removeOnWheel();
    removeOnPointerUp();
  });

  return $container.getComponent(scrollableContainer, {
    add,
    remove,
  });
};
