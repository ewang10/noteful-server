function makeNotesArray() {
    return [
        {
            id: 1,
            name: 'note 1',
            modified: '2029-01-22T16:28:32.615Z',
            folderid: 1,
            content: 'content 1'
        }, {
            id: 2,
            name: 'note 2',
            modified: '2029-01-22T16:28:32.615Z',
            folderid: 2,
            content: 'content 2'
        }, {
            id: 3,
            name: 'note 3',
            modified: '2029-01-22T16:28:32.615Z',
            folderid: 3,
            content: 'content 3'
        }
    ];
}

function makeMaliciousNote() {
    const maliciousNote = {
        id: 1, 
        name: 'Naughty naughty very naughty <script>alert("xss");</script>',
        modified: '2029-01-22T16:28:32.615Z',
        folderid: 1,
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
    }

    const expectedNote = {
        ...maliciousNote,
        name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }

    return {
        maliciousNote,
        expectedNote
    }
}

module.exports = {
    makeMaliciousNote,
    makeNotesArray
}