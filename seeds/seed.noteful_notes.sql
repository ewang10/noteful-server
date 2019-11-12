TRUNCATE notes RESTART IDENTITY CASCADE;

INSERT INTO notes
    (name, folderid, content)
VALUES
    ('Dogs', 1, 'notes 1'),
    ('Cats', 2, 'notes 2'),
    ('Pigs', 3, 'notes 3'),
    ('Birds', 3, 'notes 4'),
    ('Bears', 2, 'notes 5'),
    ('Horses', 1, 'notes 6');