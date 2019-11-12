function makeFoldersArray() {
    return [
        {
            id: 1,
            name: "folder 1"
        },
        {
            id: 2,
            name: "folder 2"
        }, {
            id: 3,
            name: "folder 3"
        }
    ];
}

function makeMaliciousFolder() {
    const maliciousFolder = {
        id: 1,
        name: 'Naughty naughty very naughty <script>alert("xss");</script>'
    }

    const expectedFolder = {
        ...maliciousFolder,
        name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;'
    }

    return {
        maliciousFolder,
        expectedFolder
    }
}

module.exports = {
    makeFoldersArray,
    makeMaliciousFolder
}