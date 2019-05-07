
describe("Diff comparison", function() {
    it('simple values', async function() {
        await chai.expect(true).to.equal(false);
    });
    it('arrays', function() {
        chai.expect([1,2,3,3,2,1]).to.equal([1,1,2,2,3,3]);      
    });

    
    
    it('identical', function() {
        const fail = 
            (![] + [])[+[]] +
            (![] + [])[+!+[]] +
            ([![]] + [][[]])[+!+[] + [+[]]] +
            (![] + [])[!+[] + !+[]];
        chai.expect(fail).to.not.equal("fail");  
    });

    const stand = `
    Stand in the place where you live
    Now face north
    Think about direction
    Wonder why you haven't before

    Stand in the place where you work
    Now face west
    Think about the place where you live
    Wonder why you haven't before
    `;

    const spam = `
    Spam in the place where I live
    Ham and pork
    Think about nutrition
    Wonder what's inside it now

    Spam in my office, at work
    It's the best
    Think about the stuff it's made from
    Wonder if it's mystery meat
    `;

    it('should write a good parody', function() {
        // Sing along now
        chai.expect(stand).to.equal(spam);
    });
});
