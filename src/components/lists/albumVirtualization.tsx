// Core Libraries
import { useEffect, useRef, useState, FC } from "react";

// Custom Components
import { AlbumDetails, VirtualizedGridItemProps, VirtualizedGridProps } from "../../globalValues";


import {
  AutoSizerProps,
  Grid as _Grid,
  GridCellProps,
  GridProps,
  WindowScroller as _WindowScroller,
  AutoSizer as _AutoSizer,
  WindowScrollerProps
} from "react-virtualized";

const Grid = (_Grid as unknown) as FC<GridProps>;
const WindowScroller = (_WindowScroller as unknown) as FC<WindowScrollerProps>;
const AutoSizer = (_AutoSizer as unknown) as FC<AutoSizerProps>;



export default function AlbumVirtualization({
  items,
  renderItem,
  itemHeight,
  itemMinWidth,
  numColumns
}: VirtualizedGridProps<AlbumDetails>) {
    // console.log(album_data)

    // const navigate = useNavigate();

    // async function playAlbum(album_name: string) {
    //     try {
    //         const albumRes: Songs[] = await invoke('get_album', { name: album_name });
    //         // console.log(albumRes);
    //         // Load the music to be played and saved
    //         await invoke('player_load_album', {queue: albumRes, index: 0});
    //         await invoke('update_current_song_played');
    //         saveQueue(albumRes);
    //         savePosition(0);
    //         await invoke('create_queue', { songs: albumRes });
    //     }
    //     catch(e) {
    //         console.log(e);
    //     }
    //     finally {
    //         // resetContextMenu();
    //     }
    // }

    // const navigateToAlbumOverview = (name: string) => {
    //     navigate("/albums/overview", {state: {name: name}});
    // }

    

    // function convertArryTo2D(data: AlbumDetails[]) {
    //     var tmp = [];
    //     for(var i = 0; i < data.length; i += 8) {
    //         tmp.push(data.slice(i, i + 8));
    //     }
    //     console.log(tmp);
    //     return tmp;
    // }


    const gridRef = useRef<any>(null);
    const containerRef = useRef<any>(null);
    const containerWidth = containerRef?.current?.clientWidth;

    const windowSize = useWindowSize();

    useEffect(() => {
        gridRef.current?.recomputeGridSize();
    }, [windowSize]);

    function calculateColumnCount(width: number) {
        return Math.floor(width / itemMinWidth);
    }

    function calculateItemWidth(width: number, columnCount: number) {
        return width / columnCount;
    }
  

    return(
        <div ref={containerRef}>
            <WindowScroller>
                {({ height, isScrolling, onChildScroll, scrollTop }: any) => (
                <AutoSizer disableHeight>
                    {() => {
                    const columnCount =
                        numColumns ?? calculateColumnCount(containerWidth);
                    const rowCount = Math.ceil(items.length / columnCount);
                    const itemWidth = calculateItemWidth(containerWidth, columnCount);

                    return (
                        <Grid
                            ref={gridRef}
                            autoHeight
                            columnCount={columnCount}
                            columnWidth={itemWidth}
                            width={containerWidth}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={itemHeight}
                            isScrolling={isScrolling}
                            scrollTop={scrollTop}
                            onScroll={onChildScroll}
                            cellRenderer={(props: GridCellProps) => {
                                const fullProps: VirtualizedGridItemProps<AlbumDetails> = {
                                ...props,
                                items,
                                columnCount: columnCount
                                };
                                return renderItem(fullProps);
                            }}
                        />
                    );
                    }}
                </AutoSizer>
                )}
            </WindowScroller>
        </div>  
    );
};


function useWindowSize() {
    // Initialize state with undefined width/height so server and client renders match
    // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined
    });

    useEffect(() => {
        // only execute all the code below in client side
        if (typeof window !== "undefined") {
        // Handler to call on window resize

        // eslint-disable-next-line
        // @ts-ignore
        function handleResize() {
            // Set window width/height to state
            // eslint-disable-next-line
            // @ts-ignore
            setWindowSize({
            // eslint-disable-next-line
            // @ts-ignore
            width: window.innerWidth,
            // eslint-disable-next-line
            // @ts-ignore
            height: window.innerHeight
            });
        }

        // Add event listener
        window.addEventListener("resize", handleResize);

        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener("resize", handleResize);
        }
    }, []); // Empty array ensures that effect is only run on mount
    return windowSize;
}