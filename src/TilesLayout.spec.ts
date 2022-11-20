import TilesLayout, { getGridParams } from './TilesLayout';

describe('check getLayoutParams', function () {
    it('should get 2x2 layout for 3 tiles', function () {
        const params = getGridParams(1280, 720, 0, 3, 16/9);
        expect(params.cols).toBe(2);
        expect(params.rows).toBe(2);
        expect(params.width).toBe(640);
        expect(params.height).toBe(360);
        expect(params.x).toBe(0);
        expect(params.xLast).toBe(320);
        expect(params.y).toBe(0);
    });
    it('should get 3x2 for 5 tiles', function () {
        const params = getGridParams(1280, 720, 4, 5, 16/9);
        expect(params.cols).toBe(3);
        expect(params.rows).toBe(2);
    });
    it('should get proper 2x1 for 2 tiles', function () {
       const params = getGridParams(1280, 720, 4, 2, 16/9);
       expect(params.cols).toBe(2);
       expect(params.rows).toBe(1);
       expect(params.width).toBe(638);
       expect(params.height).toBe( Math.floor(638 / 16 * 9));
       expect(params.x).toBe(0);
       expect(params.xLast).toBe(0);
       expect(params.y).toBe(181);
    });
});

describe('check Layout class', function () {
    it('should process simple case of 1x1', function () {
        const lm = new TilesLayout(1280, 720, 4);
        lm.setTilesCount(1);
        let tile = lm.getTileCoords(0);
        expect(tile.width).toBe(1280);
        lm.setTilesCount(3);
        tile = lm.getTileCoords(1);
        expect(tile.x).toBe(642);
        expect(tile.y).toBe(0);
        tile = lm.getTileCoords(2);
        expect(tile.x).toBe(((1280 - 636) / 2));
        expect(tile.y).toBe(362);
    });
});
