
type Props = {
    theme: string
}

export default function ThemeOptions({theme}: Props) {

    const setTheme = () => {
        document.querySelector('body')?.setAttribute("data-theme", theme);
        localStorage.setItem('theme', theme);
    }

    return(
        <div className="theme-option" id={`theme-${theme}`} onClick={setTheme}></div>
    );
}