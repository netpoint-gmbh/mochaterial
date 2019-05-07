describe("Durations (slow is 500ms)", function() {
    this.slow(500);

    function passAfter(ms, done) {
        setTimeout(function () {
            chai.expect(true).to.be.true;
            done();
        }, ms);
    }
    function failAfter(ms, done) {
        setTimeout(function () {
            try { chai.expect(false).to.be.true; }
            catch(err) { done(err); }
        }, ms);
    }
    it('passes "quickly"', function (done) { passAfter(5, done); });
    it('passes "moderately quickly"', function (done) { passAfter(251, done); });
    it('passes "moderately slowly"', function (done) { passAfter(376, done); });
    it('passes "slowly"', function (done) { passAfter(501, done); });
    it('fails "quickly"', function (done) { failAfter(5, done); });
    it('fails "moderately quickly"', function (done) { failAfter(251, done); });
    it('fails "moderately slowly"', function (done) { failAfter(376, done); });
    it('fails "slowly"', function (done) { failAfter(501, done); });
    it('times out', function (done) { failAfter(2001, done); });

    it('AssertionError is uncaught, duration is lost', function (done) {
        // This will also generate an Uncaught AssertionError in the browser console
        setTimeout(function () {
            chai.expect(false).to.be.true;
            done();
        }, 508);
    });
});