
import PlaceHolderAlbumArt from '../images/placeholder_album.png';
import ConvertFileToImage from './fileSystem/convertFileToImage';

type Props = {
    image: string | undefined,
    alt: string,
    image_type: string
}

const ImageWithFallBack = (props: Props) => {

    if(props.image_type === "album") {
        return (
            <img
                src={props.image !== undefined ? ConvertFileToImage(props.image) : PlaceHolderAlbumArt}
                alt={props.alt}
                loading='lazy'
                onError={(e) => e.currentTarget.src = PlaceHolderAlbumArt}
                className="album-image"
            />
        );
    }
    else if(props.image_type === "album-larger") {
        return (
            <img
                src={props.image !== undefined ? ConvertFileToImage(props.image) : PlaceHolderAlbumArt}
                alt={props.alt}
                loading='lazy'
                onError={(e) => e.currentTarget.src = PlaceHolderAlbumArt}
                className="album-image larger"
            />
        );
    }
    else if(props.image_type === "sidebar-playlist-image") {
        return (
            <img
                src={props.image !== undefined ? ConvertFileToImage(props.image) : PlaceHolderAlbumArt}
                alt={props.alt}
                loading='lazy'
                onError={(e) => e.currentTarget.src = PlaceHolderAlbumArt}
                className="sidebar-playlist-image"
            />
        );
    }
    else if(props.image_type === "playlist-song") {
        return (
            <img
                src={props.image !== undefined ? ConvertFileToImage(props.image) : PlaceHolderAlbumArt}
                alt={props.alt}
                loading='lazy'
                onError={(e) => e.currentTarget.src = PlaceHolderAlbumArt}
                className="album-image playlist"
            />
        );
    }
    else {
        return (
            <img
                src={props.image !== undefined ? ConvertFileToImage(props.image) : PlaceHolderAlbumArt}
                alt={props.alt}
                loading='lazy'
                onError={(e) => e.currentTarget.src = PlaceHolderAlbumArt}
            />
        );
    }
}
export default ImageWithFallBack;