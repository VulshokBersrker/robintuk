
export default function removeSpecialCharacters(input: string) {

    var tempName: string = input;
    if(input.includes("%")) {
        tempName = input.replace('%', '');
    }
    else if(input.includes("/")) {
        tempName = input.replace('/', '');
    }
    else if(input.includes("#")) {
        tempName = input.replace('#', '');
    }

    return tempName;
}

